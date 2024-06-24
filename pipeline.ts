#! /usr/bin/env tsx
import 'colors';
import { readdir } from 'fs/promises';
import { join } from 'path';
import maven from './mvn.js';

function mvn(at: string, quiet?: boolean) {
  return maven.create({ quiet, cwd: join(process.cwd(), dir) })
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

Usage: ${`[node] ${process.argv[1]} <groupId:artifactId> <release> [qualifier]`.white}
Where:
  - ${'module'.white} is an valid ${'maven module'.green} that must exist in a directory whose name matches the artifactId
  - ${'release'.white} can be one of: ${['major','minor','patch'].map(s => s.green).join(', ')}, or ${'branch'.green}.
  - ${'qualifier'.white} is any valid ${'version qualifier'.green} (only for ${'branch'.white} releases)
`.grey);
  process.exit(1)
};

const dir = module.substring(module.indexOf(':') + 1);

(async function() {
  const { stdout: prev } = mvn(dir, true).execute("help:evaluate", {
    expression: "project.version",
    forceStdout: true,
  });

  console.log(`Updating version ${prev.green} to the next ${releaseType.green} release...`)

  const { stdout: next } = mvn(dir).execute(
    ['build-helper:parse-version', 'versions:set', 'versions:commit'],
    { newVersion }
  ).then(() => mvn(dir, true).execute("help:evaluate", {
    expression: "project.version",
    forceStdout: true,
  }))

  console.log(`Updated version ${prev.green} to ${next.green}`)
  ;

  const subs = await readdir('.', { withFileTypes: true })
  console.log(subs.filter(d => d.isDirectory()));
  Promise.all(subs.filter(d => d.isDirectory()).map(({name: other}) => mvn(other, true).execute(['versions:use-dep-version'], {
    depVersion: next,
    includes: `${module}:::${prev}`,
  }))).then(() => console.log('Yippee!!'))
})();


// mvnq
//   .execute("help:evaluate", {
//     expression: "project.version",
//     forceStdout: true,
//   })
//   .then(async function ({ stdout: cur }) {
//     console.log(`Updating version ${cur.green} to the next ${releaseType.green} release...`)
//     mvn.execute(
//       ['build-helper:parse-version', 'versions:set', 'versions:commit'],
//       { newVersion }
//     ).then(() => mvnq.execute("help:evaluate", {
//       expression: "project.version",
//       forceStdout: true,
//     }))
//     .then(({ stdout: next }) => next)

//     conso
//   })
  

// mvn
//   .execute(
//     ['build-helper:parse-version', 'versions:set', 'versions:commit'],
//     { newVersion: newVersion }
//   )
//   .then(() => mvnq.execute("help:evaluate", {
//     expression: "project.version",
//     forceStdout: true,
//   }).then(({ stdout: version }) => version))
//   .then(version => {
//     console.log(`Updated to version: ${version}`);
//   })
//   .catch(() => process.exit(1))

// ;(async function () {
//   const updated = ;


//   mvn.execute(['versions:use-dep-version'], {
//     depVersion: '0.5.8',
//     includes: 'io.codearte.jfairy:jfairy:::${version}',
//   });
//   // .then(() => mvn.execute(
//   //  'versions:set'
//   //  { newVersion: '1.0.3
// })();
