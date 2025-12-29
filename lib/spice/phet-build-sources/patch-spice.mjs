// Patch spice.js to add PhET/EEsim hooks
// Works with minified Emscripten output

import fs from 'fs';

const inputFile = './spice.js';
const outputFile = './spice-patched.js';

let code = fs.readFileSync(inputFile, 'utf8');

// 1. Replace window.prompt input with custom getInput function
code = code.replace(
  'result=window.prompt("Input: ")',
  'result=getInput()'
);

// 2. Replace _emscripten_sleep with handleThings call
code = code.replace(
  /var _emscripten_sleep=ms=>Asyncify\.handleSleep\(wakeUp=>safeSetTimeout\(wakeUp,ms\)\)/,
  'var _emscripten_sleep=ms=>handleThings()'
);

// 3. Bypass the window.prompt check (make it always use our getInput)
code = code.replace(
  'if(globalThis.window?.prompt){',
  'if(true){'
);

// 4. Add the hook functions before the final export
// Find the end of the module and insert our hooks
const exportMatch = code.match(/return moduleRtn\s*}\s*export default Module/);
if (exportMatch) {
  const insertPoint = code.indexOf(exportMatch[0]);
  const hooks = `
// PhET/EEsim hooks
var getInput = () => ' ';
Module["setGetInput"] = function(f) { getInput = f; };

var handleThings = () => {};
Module["setHandleThings"] = function(f) { handleThings = f; };

Module["runThings"] = function() { callMain(arguments_); };

`;
  code = code.slice(0, insertPoint) + hooks + code.slice(insertPoint);
}

fs.writeFileSync(outputFile, code, 'utf8');
console.log(`Patched ${inputFile} -> ${outputFile}`);
