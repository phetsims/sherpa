# PhET SPICE Engine Build

Custom minimal ngspice WASM build for PhET's Circuit Construction Kit.

## Status: Testing Phase

**Date**: 2024-12-29
**WASM Size**: 5.7 MB (down from 18 MB original eecircuit-engine package)

## What We've Built

| File | Size | Description |
|------|------|-------------|
| `spice.wasm` | 5.7 MB | ngspice compiled to WebAssembly |
| `spice.js` | 76 KB | Emscripten glue code |
| `phet-spice.js` | 7 KB | PhET adapter (matches EEcircuit API) |
| `test.html` | 7 KB | Browser test harness |

## Build Process

### Prerequisites
- Docker Desktop installed and running
- macOS or Linux

### Steps to Rebuild

```bash
cd /Users/reids/phet/eecircuit-engine

# Clean Docker cache (optional, for fresh build)
docker rmi eecircuit 2>/dev/null || true

# Build ngspice WASM (~15-20 minutes)
./build-ngspice.sh

# Copy artifacts to phet-build
cp Docker/build/spice.js Docker/build/spice.wasm phet-build/
```

### Testing

```bash
cd phet-build
python3 -m http.server 8080
# Open http://localhost:8080/test.html
```

## Build Configuration

### Configure Flags (`Docker/run.sh` line 103-104)
```bash
emconfigure ../configure --disable-debug --disable-openmp --disable-xspice \
  --disable-osdi --disable-sp --disable-utf8 --with-readline=no
```

| Flag | Effect |
|------|--------|
| `--disable-debug` | No debug symbols |
| `--disable-openmp` | No parallel processing (not needed in browser) |
| `--disable-xspice` | No XSPICE extensions |
| `--disable-osdi` | No Open Source Device Interface |
| `--disable-sp` | No S-parameter analysis |
| `--disable-utf8` | No Unicode support |

### Emscripten Flags (`Docker/run.sh` line 108)
- `-g0` - No debug info
- `-Os` - Size optimization
- `ASYNCIFY=1` - Enable async/await for simulation loop
- `MODULARIZE=1` - ES6 module output
- `ALLOW_MEMORY_GROWTH=1` - Dynamic memory

## API Usage

```javascript
import { Simulation } from './phet-spice.js';

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

## Circuit Components Supported

### Confirmed Working
- Resistors (R)
- Capacitors (C)
- Inductors (L)
- DC voltage sources (V ... DC)
- Transient analysis (.tran)

### Should Work (untested)
- AC sources (V ... SIN)
- Current sources (I)
- Diodes (D)
- Switches (S)
- BJT transistors (Q)
- Basic MOSFET (M with mos1 model)
- JFET (J)
- Dependent sources (E, F, G, H)

## Future Optimization (TODO)

### Device Stripping (disabled, needs debugging)
The `Docker/phet_strip_devices.sh` script can remove ~30 IC/RF device models to further reduce WASM size. Currently disabled due to sed pattern issues with configure.ac.

Target devices to remove:
- BSIM MOSFET models (bsim1-4, variants)
- SOI devices
- HiSIM models
- Transmission lines
- Advanced bipolar models

Potential size reduction: 5.7 MB → ~2-3 MB (estimated)

### To Re-enable Device Stripping
1. Debug sed patterns in `Docker/phet_strip_devices.sh`
2. Uncomment lines 79-86 in `Docker/run.sh`
3. Rebuild

## Integration with PhET CCK

The `phet-spice.js` API matches what `EECircuitAdapter.ts` expects:
- `start()` → `Promise<void>`
- `setNetList(string)` → `void`
- `runSim()` → `Promise<Result>`
- `getError()` → `string[]`

## Files Modified from Upstream

### `Docker/run.sh`
- Added configure flags for size reduction
- Changed `-g1` to `-g0 -Os` for smaller output
- Commented out `inject.mjs` call (not needed with our wrapper)
- Added (disabled) call to `phet_strip_devices.sh`

### `Docker/Dockerfile`
- Added `COPY ./phet_strip_devices.sh /`

### New Files
- `Docker/phet_strip_devices.sh` - Device removal script (disabled)
- `phet-build/phet-spice.js` - PhET adapter
- `phet-build/test.html` - Test harness
- `phet-build/README.md` - This file

## Upstream Repository

Source: https://github.com/eelab-dev/eecircuit-engine

We are not forking; instead using patch scripts applied during Docker build.


#################

Here's a fuller patch:

  To reproduce from a fresh clone:
  git clone https://github.com/eelab-dev/eecircuit-engine
  cd eecircuit-engine
  git apply phet-ngspice-build.patch
  ./build-ngspice.sh
  cd phet-build
  cp ../Docker/build/spice.* .
  node patch-spice.mjs
  node bundle.mjs