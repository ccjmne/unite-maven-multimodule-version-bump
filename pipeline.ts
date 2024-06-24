#! /usr/bin/env tsx

import 'colors';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import maven from './mvn.js';

function mvn(at: string, quiet?: boolean) {
  return maven.create({ quiet, cwd: join(process.cwd(), at) })
}

const [module, release, qualifier] = process.argv.slice(2)
const newVersion = {
  major: '${parsedVersion.nextMajorVersion}.0.0',
  minor: '${parsedVersion.majorVersion}.${parsedVersion.nextMinorVersion}.0',
  patch: '${parsedVersion.majorVersion}.${parsedVersion.minorVersion}.${parsedVersion.nextIncrementalVersion}',
  branch: '${parsedVersion.majorVersion}.${parsedVersion.minorVersion}.${parsedVersion.incrementalVersion}-' + qualifier
}[release];

if (!newVersion || !/^\S+:(?<artifact>\S+$)/.test(module.trim()) || (release === 'branch' && !(qualifier ?? ''))) {
  console.error(`
${`Invalid arguments: ${process.argv.slice(2).join(' ').white}`.red}

Usage: ${`[node] ${'pipeline.ts' ?? process.argv[1]} <groupId:artifactId> <release> [qualifier]`.white}
Where:
  - ${'module'.white} is an valid ${'maven module'.green} that must exist in a directory whose name matches the artifactId
  - ${'release'.white} can be one of: ${['major','minor','patch'].map(s => s.green).join(', ')}, or ${'branch'.green}.
  - ${'qualifier'.white} is any valid ${'version qualifier'.green} (only for ${'branch'.white} releases)
`.grey);
  process.exit(1)
};

const dir = module.substring(module.indexOf(':') + 1);

(async function() {
  const { stdout: prev } = await mvn(dir, true).execute(
    // mvn help:evaluate --quiet --define forceStdout --define expression=project.version
    'help:evaluate',
    { expression: 'project.version', forceStdout: true }
  );

  console.log(`Updating ${module.green} from version ${prev.white} to the next ${release.green} release...`)

  const { stdout: next } = await mvn(dir).execute(
    // mvn build-helper:parse-version versions:set versions:commit --define newVersion=${newVersion}
    ['build-helper:parse-version', 'versions:set', 'versions:commit'],
    { newVersion }
  ).then(() => mvn(dir, true).execute(
    // mvn help:evaluate --quiet --define forceStdout --define expression=project.version
    'help:evaluate',
    { expression: 'project.version', forceStdout: true })
  )

  console.log(`Updated ${module.green} from version ${prev.white} to ${next.green}.`)
  console.log(`Updating dependencies that used to point to ${module.green} version ${prev.green}...`)

  const subs = await readdir('.', { withFileTypes: true })

  Promise.all(subs.filter(({ name }) => existsSync(join('.', name, 'pom.xml'))).map(({ name: other }) => mvn(other).execute(
    // mvn versions:use-dep-version --define forceVersion=true --define depVersion=${next} --define includes=${module}:::${prev}
    ['versions:use-dep-version', 'versions:commit'],
    {
      depVersion: next,
      forceVersion: true, // skip validation
      includes: `${module}:::${prev}`,
    }).then(({ stdout }) => console.log(stdout.includes(`Updated ${module}`)
      ? `Updated ${module.white} from version ${next.white} to version ${next.green} in ${other.green}.`
      : `No dependency on ${module.white} at version ${prev.white} in ${other.white}.`
    ))
  )).then(() => console.log('All done!'.green))
})();
