// Copyright 2015, University of Colorado Boulder

/**
 * Creates sherpa preloads for the KaTeX math display library. Used for FormulaNode.
 *
 * KaTeX is usually provided as one JS file, one CSS file, and a number of dynamically-loaded font files (loaded only
 * when they are used AND supported by the specific browser). For our purposes, we want one JS file that we can preload.
 *
 * This script generates multiple packaged versions of KaTeX in single JS files that embed different subsets of the font
 * files (from all, a few, or none), and includes all of the JS/CSS and logic to load the CSS and then preload things
 * into memory.
 *
 * During simulation development, the file including ALL embedded font files (e.g. katex-0.5.1-css-all.js) should
 * generally be used if the embedded mathematics may change. Then for the production version of the simulation, first
 * test which font files are needed by using the package with NO font files embedded (e.g. katex-0.5.1-css-none.js).
 * The browser will show failed requests for font files that will be needed. Then (if the package with only the specific
 * font files is not already provided), add a writePackage() statement at the end of this file which will filter for the
 * needed font files only, and run this file from the directory it's in to generate the package file, e.g.:
 * # node packageKatexCSS.js
 *
 * Presumably after generating new files, you'll want to add the necessary license entries.
 *
 * See https://github.com/phetsims/scenery/issues/457 for more information.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

var fs = require( 'fs' );

// workaround for how to get to fs for loadFileAsDataURI
global.phet = {
  chipper: {
    fs: fs
  }
};
var loadFileAsDataURI = require( '../../chipper/js/common/loadFileAsDataURI' );

// Referece to the KaTeX directory we're processing. This will need to be updated for KaTeX upgrades
var katexDir = 'katex-0.5.1';

// Load the CSS as a string
var css = fs.readFileSync( katexDir + '/katex.min.css', 'utf8' );

// Our fragment of JS to be included in all packaged files.
var stylesheetPreloadFragment = fs.readFileSync( 'stylesheetPreloadFragment.js', 'utf8' );

// Strip out old-IE compatibility source statements, so we only have one 'src' rule for each font face.
css = css.replace( /src:url\(fonts\/[^.]+\.eot\);/g, '' );

/**
 * Write out some JavaScript that will load the CSS stylesheets (and preload styles) for specific embedded fonts.
 *
 * @param {function} fontPredicate - Called as fontPredicate( name ) => boolean, should return whether this
 *                                   font/style combination (e.g. 'KaTeX_Size1-Regular') should be included
 *                                   (embedded) in this particular CSS package.
 */
function writePackage( filename, fontPredicate ) {
  // A copy of the CSS for us to modify
  var packageCSS = css;

  // Information about embedded fonts, so the runtime can preload them into memory.
  var usedFontData = [];

  // Process each place in the CSS that specifies a list of url/format combinations for a source.
  var srcPhrases = packageCSS.match( /src:(url\([^)]+\) format\([^)]+\),?)+;/g );
  srcPhrases.forEach( function( srcPhrase ) {
    // Extract the URL fragment with information we care about, e.g. 'KaTeX_Size1-Regular'
    var name = srcPhrase.match( /url\(fonts\/([^\)]+)\.[^)]+\)/ )[ 1 ];

    if ( fontPredicate( name ) ) {
      // CSS font-family, e.g. 'KaTeX_Size1'. Same as that part of the filename for all current fonts.
      var family = name.slice( 0, name.indexOf( '-' ) );

      // CSS font-style and font-weight.
      var style = {
        Regular: { weight: 400, style: 'normal' },
        Bold: { weight: 700, style: 'normal' },
        Italic: { weight: 400, style: 'italic' },
        BoldItalic: { weight: 700, style: 'italic' }
      }[ name.slice( name.indexOf( '-' ) + 1 ) ];

      // Mark the font as used, so we can preload it
      usedFontData.push( {
        family: family,
        weight: style.weight,
        style: style.style
      } );

      // Grab the WOFF file as a data URI. Currently all supported platforms are reported to work with just the .woff,
      // so we only embed this format.
      var woffDataURI = loadFileAsDataURI( katexDir + '/fonts/' + name + '.woff' );

      // Replace the entire source list with our new (single) source list, with the embedded data URI
      packageCSS = packageCSS.replace( srcPhrase, 'src:url(' + woffDataURI + ') format(\'woff\');' );
    }
  } );

  var output =
    '// This file was created by packageKatexCSS.js\n' +
    '(function(){\n' +
    '  var css = \'' + packageCSS.replace( /'/g, '\\\'' ) + '\';\n' +
    '  var usedFontData = ' + JSON.stringify( usedFontData ) + ';\n' +
    stylesheetPreloadFragment + // our main logic
    '})();\n';

  fs.writeFileSync( filename, output );
}

// Package with everything embedded. Guarantees loads, but it is quite large
writePackage( '../lib/katex-0.5.1-css-all.js', function( fontName ) {
  return true;
} );

// Package with NOTHING embedded. Switch to this to see which font file requests the browser makes. Those are the files
// that need to be included in the particular package used.
writePackage( '../lib/katex-0.5.1-css-none.js', function( fontName ) {
  return false;
} );
