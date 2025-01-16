# Notes

# Implementation Notes
Fluent is included in our project in a complicated way. But the strategy supports typescript and avoiding
preloading the library, so it is worth it.

1) Source code from the Fluent.js project was taken from the src directory of https://github.com/projectfluent/fluent.js/tree/main/fluent-bundle/src and
copied into sherpa/lib/fluent-bundle/src. Only the relevant files were copied to avoid bringing in unnecessary code.
2) tsconfig-fluent.json was created to include the copied files. Additional compilerOptions were added to this file
as necessary to support the build.
3) tsconfig-fluent.json was added as a reference in sherpa's tsconfig.json.
4) A reference to tsconfig-fluent.json was added to perennial-alias/buildjson/tsconfig.json.
5) Minor changes or @ts-ingore comments were added to the copied files to avoid compilation errors.
6) Fluent code can now be imported like this:
```typescript
import { FluentBundle } from '../../../sherpa/lib/fluent-bundle/src/bundle.js';
import { FluentResource } from '../../../sherpa/lib/fluent-bundle/src/resource.js';
```
