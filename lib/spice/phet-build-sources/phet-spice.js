/**
 * PhET Minimal SPICE Engine
 * A focused wrapper around ngspice WASM for Circuit Construction Kit.
 *
 * Provides the same interface as EEcircuit's Simulation class:
 *   - start() -> Promise<void>
 *   - setNetList(string) -> void
 *   - runSim() -> Promise<Result>
 *   - getError() -> string[]
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import Module from './spice-patched.js';

export class Simulation {
  constructor() {
    this._module = null;
    this._initialized = false;
    this._netlist = '';
    this._errors = [];
    this._info = '';

    // Command sequence for running a simulation
    this._commands = [' ', 'source /circuit.cir', 'run', 'write /out.raw'];
    this._cmdIndex = 0;

    // Promise resolvers
    this._initResolve = null;
    this._runResolve = null;
    this._waitResolve = null;
  }

  /**
   * Initialize the WASM module. Must be called once before solving.
   * @returns {Promise<void>}
   */
  async start() {
    const self = this;

    return new Promise((resolve) => {
      self._initResolve = resolve;
      self._startInternal();
    });
  }

  async _startInternal() {
    const self = this;

    const moduleOptions = {
      noInitialRun: true,

      print: (msg = '') => {
        self._info += msg + '\n';
      },

      printErr: (msg = '') => {
        // Filter expected warnings
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

    this._module = await Module(moduleOptions);

    // Set up minimal virtual filesystem
    this._module.FS.writeFile('/spinit', '* PhET ngspice init\n');
    this._module.FS.writeFile('/proc/meminfo', '');

    // Write a dummy circuit for the initial cycle (avoids "no circuits loaded" error)
    this._module.FS.writeFile('/circuit.cir', `Dummy Init Circuit
V1 1 0 DC 1
R1 1 0 1
.tran 1m 1m
.END`);

    // Set up command input handler
    this._module.setGetInput(() => {
      if (self._cmdIndex < self._commands.length) {
        const cmd = self._commands[self._cmdIndex++];
        return cmd;
      }
      return ' ';
    });

    // Set up the async handler for simulation cycles
    this._module.setHandleThings(() => {
      self._module.Asyncify.handleAsync(async () => {
        // Check if command sequence is complete
        if (self._cmdIndex >= self._commands.length) {
          // Read and parse results
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

          // Signal initialization complete on first run
          if (!self._initialized) {
            self._initialized = true;
            if (self._initResolve) {
              self._initResolve();
              self._initResolve = null;
            }
          }

          // Wait for next runSim() call
          await new Promise(resolve => {
            self._waitResolve = resolve;
          });

          // Write new netlist for next run
          self._module.FS.writeFile('/circuit.cir', self._netlist);
          self._cmdIndex = 0;
        }
      });
    });

    // Start ngspice main loop
    this._module.runThings();
  }

  /**
   * Set the netlist for the next simulation.
   * @param {string} netlist - SPICE netlist
   */
  setNetList(netlist) {
    this._netlist = netlist;
  }

  /**
   * Run the simulation and return results.
   * @returns {Promise<Object>} - Parsed results
   */
  async runSim() {
    if (!this._initialized) {
      throw new Error('Call start() first');
    }

    // Clear errors for this run
    this._errors = [];
    this._info = '';

    // Write netlist
    this._module.FS.writeFile('/circuit.cir', this._netlist);
    this._cmdIndex = 0;

    return new Promise((resolve) => {
      this._runResolve = resolve;
      // Continue the simulation loop
      if (this._waitResolve) {
        this._waitResolve();
        this._waitResolve = null;
      }
    });
  }

  /**
   * Get errors from the last simulation.
   * @returns {string[]}
   */
  getError() {
    return this._errors;
  }

  /**
   * Get info/output from the last simulation.
   * @returns {string}
   */
  getInfo() {
    return this._info;
  }

  /**
   * Check if initialized.
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Parse ngspice binary output format.
   * @param {Uint8Array} rawData
   * @returns {Object}
   */
  _parseOutput(rawData) {
    const text = new TextDecoder().decode(rawData);
    const binaryOffset = text.indexOf('Binary:');

    if (binaryOffset === -1) {
      return { error: 'No binary data found', header: text, data: [] };
    }

    const header = text.substring(0, binaryOffset);
    const lines = header.split('\n');

    // Parse header
    const numVarsLine = lines.find(l => l.startsWith('No. Variables'));
    const numPointsLine = lines.find(l => l.startsWith('No. Points'));
    const flagsLine = lines.find(l => l.startsWith('Flags'));

    const numVars = parseInt(numVarsLine?.split(':')[1] || '0');
    const numPoints = parseInt(numPointsLine?.split(':')[1] || '0');
    const isComplex = flagsLine?.includes('complex') || false;

    // Parse variable names
    const varStartIdx = lines.indexOf('Variables:') + 1;
    const variables = [];
    for (let i = 0; i < numVars; i++) {
      const line = lines[varStartIdx + i];
      if (line) {
        const parts = line.trim().split(/\s+/);
        variables.push({
          name: parts[1] || '',
          type: parts[2] || 'notype'
        });
      }
    }

    // Parse binary data
    const view = new DataView(rawData.buffer, binaryOffset + 8);
    const values = [];

    if (isComplex) {
      for (let i = 0; i < view.byteLength - 15; i += 16) {
        values.push({
          real: view.getFloat64(i, true),
          img: view.getFloat64(i + 8, true)
        });
      }
    } else {
      for (let i = 0; i < view.byteLength - 7; i += 8) {
        values.push(view.getFloat64(i, true));
      }
    }

    // Reshape into per-variable arrays
    const data = variables.map((v, idx) => ({
      name: v.name,
      type: v.type,
      values: []
    }));

    for (let pt = 0; pt < numPoints; pt++) {
      for (let v = 0; v < numVars; v++) {
        const idx = pt * numVars + v;
        if (idx < values.length) {
          data[v].values.push(values[idx]);
        }
      }
    }

    return {
      header: header,
      numVariables: numVars,
      variableNames: variables.map(v => v.name),
      numPoints: numPoints,
      dataType: isComplex ? 'complex' : 'real',
      data: data.filter(d => d.type !== 'notype')
    };
  }
}

// Global export for non-module usage (matches existing EEcircuit pattern)
if (typeof window !== 'undefined') {
  window.PhetSpice = { Simulation };
}
