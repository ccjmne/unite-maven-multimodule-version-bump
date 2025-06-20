Revisions: 2            Maven Multi-Module Version Bump             Éric NICOLAS
Latest: 2025-06-20

1. Usage -----------------------------------------------------------------------

    Usage: [tsx] bump.ts <groupId:artifactId> <bump> [qualifier] [--nodeps]

    Where:

        groupId:artifactId      is a valid maven module that must exist in a
                                directory whose name matches artifactId

        bump                    can be one of: major, minor, patch, branch, or
                                release.

        qualifier               is any valid version qualifier (mandatory for
                                branch bumps, illegal for release bumps)

        -n                      Can appear anywhere in the arguments and will
        --nodeps                disable updating the dependents on the current
        --no-update-dependents  version to use the new version.  See Section 2.

        Using the release bump simply drops the qualifier and has no effect when
        the current version already had none.

    INTERPRETER

        It actually is a piece of *TypeScript* code.  That's right, it's bloated
        already, but heh, we're not here to save CPU cycles, we're just here to
        save developer sanity—I mean, time—and build something that works,
        consistently.

        By default, it will attempt to use the `tsx` interpreter, but you may
        choose to go with `node-ts` or something of the same vein.  `Deno` won't
        do, since we're using Node libraries.

        You may edit the shebang in `bump.ts` to use your interpreter of choice
        and keep using it as if it were an executable directly, or explicitly
        feed it (the same file) to it (your TypeScript interpreter of choice).

2. What it can do --------------------------------------------------------------

    It can't make coffee.  I will cover this section in greater detail at some
    point in the future (surely).

3. Under the hood --------------------------------------------------------------

    It just delegates to `mvn`, all of it, everything.  It's (immensely) slow,
    it's cumbersome, it presumes that—and will not work unless—you have `mvn`
    installed and available.

                                                          vim: tw=80 sw=4 et sta
