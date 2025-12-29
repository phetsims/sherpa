// Bundle phet-spice into a single ES module with inline WASM
// This creates a self-contained module similar to eecircuit-engine

import fs from 'fs';

const wasmPath = './spice.wasm';
const gluePath = './spice-patched.js';
const adapterPath = './phet-spice.js';
const outputPath = './phet-spice-bundle.js';

console.log('Reading files...');

const wasmBinary = fs.readFileSync(wasmPath);
const glueCode = fs.readFileSync(gluePath, 'utf8');
const adapterCode = fs.readFileSync(adapterPath, 'utf8');

console.log(`WASM size: ${(wasmBinary.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`Glue code: ${(glueCode.length / 1024).toFixed(1)} KB`);
console.log(`Adapter: ${(adapterCode.length / 1024).toFixed(1)} KB`);

// Base64 encode WASM
const wasmBase64 = wasmBinary.toString('base64');
console.log(`WASM base64: ${(wasmBase64.length / 1024 / 1024).toFixed(2)} MB`);

// Modify glue code to use inline WASM instead of fetch
// The Emscripten code fetches spice.wasm - we need to override this
let modifiedGlue = glueCode;

// CRITICAL: Remove the `new URL("spice.wasm", import.meta.url)` pattern that webpack tries to resolve
// The original function is: function findWasmBinary(){if(Module["locateFile"]){return locateFile("spice.wasm")}return new URL("spice.wasm",import.meta.url).href}
// Replace the entire function with one that always uses locateFile
modifiedGlue = modifiedGlue.replace(
  /function findWasmBinary\(\)\{if\(Module\["locateFile"\]\)\{return locateFile\("spice\.wasm"\)\}return new URL\("spice\.wasm",import\.meta\.url\)\.href\}/,
  'function findWasmBinary(){return Module["locateFile"]("spice.wasm","")}'
);

// Remove the external import and make it self-contained
// The glue code has: export default Module
// We'll wrap everything and inject the WASM

const bundle = `// Copyright 2025, University of Colorado Boulder

// PhET SPICE Bundle - Self-contained ngspice WASM for Circuit Construction Kit
// Generated: ${new Date().toISOString()}
//
// This bundle contains:
// - ngspice compiled to WebAssembly (base64 encoded)
// - Emscripten glue code (patched for PhET)
// - PhET adapter matching EEcircuit API

// @ts-nocheck
/* eslint-disable */

const WASM_BASE64 = "${wasmBase64}";

// Decode base64 to binary
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Create a blob URL for the WASM
const wasmBytes = base64ToArrayBuffer(WASM_BASE64);
const wasmBlob = new Blob([wasmBytes], { type: 'application/wasm' });
const wasmUrl = URL.createObjectURL(wasmBlob);

// Patch the glue code to use our blob URL
${modifiedGlue.replace(
  'export default Module',
  `
// Override WASM loading to use inline base64
const originalModule = Module;
const PatchedModule = async function(moduleArg = {}) {
  // Set locateFile to return our blob URL for the wasm
  moduleArg.locateFile = (path, prefix) => {
    if (path.endsWith('.wasm')) {
      return wasmUrl;
    }
    return prefix + path;
  };
  return originalModule(moduleArg);
};
export { PatchedModule as Module };
`
)}

// PhET Adapter (internal, not exported directly)
${adapterCode
  .replace("import Module from './spice-patched.js';", "// Module imported from above")
  .replace("export class Simulation", "class Simulation")
  .replace(/\/\/ Global export[\s\S]*$/, "// Global export handled below")}

// Override the Simulation class to use PatchedModule
const OriginalSimulation = Simulation;
class PatchedSimulation extends OriginalSimulation {
  async _startInternal() {
    const self = this;

    const moduleOptions = {
      noInitialRun: true,
      locateFile: (path, prefix) => {
        if (path.endsWith('.wasm')) {
          return wasmUrl;
        }
        return prefix + path;
      },
      print: (msg = '') => {
        self._info += msg + '\\n';
      },
      printErr: (msg = '') => {
        if (msg !== "Warning: can't find the initialization file spinit." &&
            msg !== "Using SPARSE 1.3 as Direct Linear Solver") {
          console.warn('ngspice:', msg);
          self._errors.push(msg);
        }
      },
      setGetInput: () => ' ',
      setHandleThings: () => {},
      runThings: () => {}
    };

    // Use PatchedModule instead of Module
    const ModuleFactory = PatchedModule || Module;
    this._module = await ModuleFactory(moduleOptions);

    this._module.FS.writeFile('/spinit', '* PhET ngspice init\\n');
    this._module.FS.writeFile('/proc/meminfo', '');
    this._module.FS.writeFile('/circuit.cir', \`Dummy Init Circuit
V1 1 0 DC 1
R1 1 0 1
.tran 1m 1m
.END\`);

    this._module.setGetInput(() => {
      if (self._cmdIndex < self._commands.length) {
        const cmd = self._commands[self._cmdIndex++];
        return cmd;
      }
      return ' ';
    });

    this._module.setHandleThings(() => {
      self._module.Asyncify.handleAsync(async () => {
        if (self._cmdIndex >= self._commands.length) {
          try {
            const rawData = self._module.FS.readFile('/out.raw');
            const result = self._parseOutput(rawData);
            if (self._runResolve) {
              self._runResolve(result);
              self._runResolve = null;
            }
          } catch (e) {
            console.error('Failed to read results:', e);
            if (self._runResolve) {
              self._runResolve({ error: e.message, data: [] });
              self._runResolve = null;
            }
          }

          if (!self._initialized) {
            self._initialized = true;
            if (self._initResolve) {
              self._initResolve();
              self._initResolve = null;
            }
          }

          await new Promise(resolve => {
            self._waitResolve = resolve;
          });

          self._module.FS.writeFile('/circuit.cir', self._netlist);
          self._cmdIndex = 0;
        }
      });
    });

    this._module.runThings();
  }
}

export { PatchedSimulation as Simulation };

if (typeof window !== 'undefined') {
  window.PhetSpice = { Simulation: PatchedSimulation };
}
`;

fs.writeFileSync(outputPath, bundle, 'utf8');

const stats = fs.statSync(outputPath);
console.log(`\nBundle created: ${outputPath}`);
console.log(`Total size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
