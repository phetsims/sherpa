# Notes

See https://github.com/projectfluent/fluent.js/ for an overview on Fluent.js library.

# Implementation Notes
Fluent is included in our project in a complicated way. But the strategy supports typescript and avoiding
preloads, so it is worth it.

In the future, PhET may support a more standard way of importing Fluent.js with npm. That cannot be done
now because our transpiler doesn't visit node_modules. But until then, this is a workaround.

1) Source code from the Fluent.js project was taken from the src directory of https://github.com/projectfluent/fluent.js/tree/main/fluent-bundle/src and
copied into sherpa/lib/fluent/fluent-bundle-0.18.0/src. Only the relevant files were copied to avoid bringing in unnecessary code.
2) Source code from fluent-syntax was taken directly from src at https://github.com/projectfluent/fluent.js/tree/main/fluent-bundle/src
and copied into sherpa/lib/fluent/fluent-syntax-0.19.0/src.
3) tsconfig-fluent.json was created to include the copied files. Additional compilerOptions were added to this file
as necessary to support the build.
4) tsconfig-fluent.json was added as a reference in sherpa's tsconfig.json.
5) tsconfig-fluent.json was added as a reference to chipper/js/browser-and-node/tsconfig-dependencies.json.
6) Minor changes or @ts-ingore comments were added to the copied files to avoid compilation errors.
7) chipper/js/browser-and-node/FluentLibrary.ts was created to export the Fluent classes from the copied files. This
allows us to import Fluent classes in both sim and Node code without going through sherpa source directories.
8) Fluent code can now be imported like this:
```typescript
import FluentLibrary, { FluentBundle, FluentResource } from '../browser-and-node/FluentLibrary.js';
```
9) The license for FLuent.js was copied into sherpa/licenses/fluent-bundle-0.18.0.txt. Even though we use both fluent-bundle and fluent-syntax,
they share the same license and so only one license file was created.

We are using fluent-bundle 0.18.0 and fluent-syntax 0.19.0. Fluent versions each package independelty.