# PhET SPICE Bundle

Self-contained ngspice WASM build for Circuit Construction Kit.

## Contents

- `phet-spice-bundle.js` (2.6 MB) - ngspice compiled to WebAssembly with base64-encoded binary

## Licenses

| Component | License | Copyright |
|-----------|---------|-----------|
| ngspice | BSD | The ngspice team |
| eecircuit-engine build scripts | MIT | 2024 EElab.dev |
| Emscripten runtime | MIT | Emscripten contributors |

## How This Was Built

### Source Repository

Built from https://github.com/eelab-dev/eecircuit-engine with PhET-specific optimizations.

Working directory: `/Users/reids/phet/eecircuit-engine`

### Build Process

1. **Build ngspice WASM** (requires Docker):
   ```bash
   cd /Users/reids/phet/eecircuit-engine
   ./build-ngspice.sh
   ```
   This runs a Docker container that:
   - Clones ngspice from the upstream mirror
   - Applies patches for Emscripten compatibility
   - Compiles with size-optimized flags
   - Outputs `spice.js` and `spice.wasm` to `Docker/build/`

2. **Copy and patch the output**:
   ```bash
   cp Docker/build/spice.js Docker/build/spice.wasm phet-build/
   cd phet-build
   node patch-spice.mjs
   ```

3. **Create the bundle**:
   ```bash
   node bundle.mjs
   ```
   This creates `phet-spice-bundle.js` which:
   - Base64 encodes the WASM binary inline
   - Patches the Emscripten glue to use blob URLs (webpack-compatible)
   - Includes the PhET adapter API

### Build Configuration

Configure flags in `Docker/run.sh`:
```bash
emconfigure ../configure --disable-debug --disable-openmp --disable-xspice \
  --disable-osdi --disable-sp --disable-utf8 --with-readline=no
```

Emscripten flags: `-g0 -Os` (no debug info, size-optimized)

### Size Breakdown

| Stage | Size |
|-------|------|
| Raw WASM (stripped) | 1.9 MB |
| Base64 encoded bundle | 2.6 MB |
| Previous raw WASM (unstripped) | 5.7 MB |
| Previous eecircuit-engine package | 19 MB |

### Device Stripping

The build uses `phet_strip_devices.sh` to remove IC design and RF device models not needed for educational circuits. This removes registrations for ~35 device types (BSIM, SOI, HiSIM, transmission lines, etc.) from `dev.c`, reducing WASM size by 67%.

### API

```javascript
import { Simulation } from './phet-spice-bundle.js';

const sim = new Simulation();
await sim.start();

sim.setNetList(`My Circuit
V1 1 0 DC 5
R1 1 0 100
.tran 1m 10m
.END`);

const result = await sim.runSim();
// result.data contains voltage/current arrays
```

## Rebuilding

If you need to rebuild:

1. Ensure Docker is installed and running
2. Clone/update eecircuit-engine repo
3. Run the build steps above
4. Copy the new `phet-spice-bundle.js` here
5. Update the import path in `EEcircuitSolverManager.ts`

## Date

Last built: 2025-12-29
