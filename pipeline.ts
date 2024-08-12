#! /usr/bin/env tsx

import 'colors'
import { existsSync } from 'fs'
import { readdir } from 'fs/promises'
import { basename, join } from 'path'
import maven from './mvn.js'

const [module, release, qualifier] = process.argv.slice(2)
const newVersion = {
  major:   '${parsedVersion.nextMajorVersion}.0.0',
  minor:   '${parsedVersion.majorVersion}.${parsedVersion.nextMinorVersion}.0',
  patch:   '${parsedVersion.majorVersion}.${parsedVersion.minorVersion}.${parsedVersion.nextIncrementalVersion}',
  branch:  '${parsedVersion.majorVersion}.${parsedVersion.minorVersion}.${parsedVersion.incrementalVersion}-' + qualifier,
  release: '${parsedVersion.majorVersion}.${parsedVersion.minorVersion}.${parsedVersion.incrementalVersion}',
}[release]

if (!newVersion || !/^\S+:\S+$/.test(module) || (release === 'branch' && !qualifier)) {
  console.error(`
    ${`Invalid arguments: ${process.argv.slice(2).join(' ').white}`.red}

    Usage: ${`[node] ${basename(process.argv[1])} <groupId:artifactId> <release> [qualifier]`.white}

    Where:
      - ${'module'.white} is a valid ${'maven module'.green} that must exist in a directory whose name matches the module's ${'artifactId'.white}
      - ${'release'.white} can be one of: ${'major'.green}, ${'minor'.green}, ${'patch'.green}, ${'branch'.green}, or ${'release'.green}.
      - ${'qualifier'.white} is any valid ${'version qualifier'.green} (only for ${'branch'.white} releases)

    Using the ${'release'.green} option simply drops the ${'qualifier'.white} and has no effect when the current version already had none.
    `.replace(/^ {4}/gm, '').replace(/^\n|\n$/g, '').grey
  )
  process.exit(1)
}

(async function () {
  const dir = module.substring(module.indexOf(':') + 1)
  const { stdout: prev } = await mvn(dir, true).execute(
    // mvn help:evaluate --quiet --define forceStdout --define expression=project.version
    'help:evaluate',
    { expression: 'project.version', forceStdout: true }
  )

  console.log(`Updating ${module.green} from version ${prev.white} to the next ${release.green} version...`)

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
  console.log(`Updating dependencies that used to point to ${module.green} version ${prev.white}...`)

  const modules = (await readdir(process.cwd(), { withFileTypes: true })).map(({ name }) => name)
    .filter(name => existsSync(join(process.cwd(), name, 'pom.xml')))
  const maxlen = modules.reduce((m, { length }) => Math.max(m, length), 0)
  await Promise.all(
    modules.map(other => mvn(other).execute(
      // mvn versions:use-dep-version --define forceVersion=true --define depVersion=${next} --define includes=${module}:::${prev}
      ['versions:use-dep-version', 'versions:commit'],
      { depVersion: next, forceVersion: true, includes: `${module}:::${prev}` }
    ).then(({ stdout }) => console.log(stdout.includes(`Updated ${module}`)
      ? `- in ${other.green}:${' '.repeat(maxlen - other.length)} Updated ${module.white} from version ${prev.white} to version ${next.green}.`
      : `- in ${other.white}:${' '.repeat(maxlen - other.length)} No dependency on ${module.white} at version ${prev.white}.`
    ))
  ))

  console.log(`All ${'done'.green}!`)
})()

function mvn(workdir: string, quiet?: boolean) {
  return maven.create({ quiet, cwd: join(process.cwd(), workdir) })
}
