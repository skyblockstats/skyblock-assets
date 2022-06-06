## Adding a new pack

1. Put packs in the `packs` directory
2. `npm run generate`

## Modifying code

If you're modifying `src`, do `tsc -w`.\
If you're modifying generator, you can copy the script from the package.json and run it without the compression part.

## Publishing

Modify the version in package.json and src/index.ts, `tsc`, and commit.
