/**
 * License info for all of the projects
 * The license text is taken directly from a published .js file where available
 *
 * Below, `selectedLicense` indicates which license PhET has selected to use for a library available under multiple licenses.
 *
 * @author Sam Reid
 */
module.exports = function( grunt ) {
  var licenseInfo = {
    'almond-0.2.9': {
      text: 'almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.\n' +
            'Available via the MIT or new BSD license.\n' +
            'see: http://github.com/jrburke/almond for details',
      usage: [ 'sim' ],
      selectedLicense: 'MIT'
    },
    'benchmark-1.0.0': {
      text: 'Benchmark.js v1.0.0 <http://benchmarkjs.com/>\n' +
            'Copyright 2010-2012 Mathias Bynens <http://mths.be/>\n' +
            'Based on JSLitmus.js, copyright Robert Kieffer <http://broofa.com/>\n' +
            'Modified by John-David Dalton <http://allyoucanleet.com/>\n' +
            'Available under MIT license <http://mths.be/mit>',
      usage: [ 'development' ]
    },
    'bootstrap-2.2.2': {
      text: 'Bootstrap v2.2.2\n' +
            '\n' +
            'Copyright 2012 Twitter, Inc\n' +
            'Licensed under the Apache License v2.0\n' +
            'http://www.apache.org/licenses/LICENSE-2.0\n' +
            '\n' +
            'Designed and built with all the love in the world @twitter by @mdo and @fat.',
      usage: [ 'docs' ],
      notes: ''
    },
    'canvg-1.3': {
      text: 'canvg.js - Javascript SVG parser and renderer on Canvas\n' +
            'MIT Licensed\n' +
            'Gabe Lerner (gabelerner@gmail.com)\n' +
            'http://code.google.com/p/canvg/\n' +
            '\n' +
            'Requires: rgbcolor.js - http://www.phpied.com/rgb-color-parser-in-javascript/',
      usage: [ 'development' ],
      notes: 'Used in scenery unit tests, may be used in sims later on if we convert SVG=>canvas. Downloaded 2/9/2015 from https://github.com/gabelerner/canvg'
    },
    'FileSaver': {
      text: 'FileSaver.js by Eli Grey (http://eligrey.com)\n' +
            'https://github.com/eligrey/FileSaver.js/\n' +
            'Released under the X11/MIT license',
      usage: [ 'sim' ],
      notes: 'Used for saving screenshot images',
      selectedLicense: 'MIT'
    },
    'font-awesome': {
      text: 'Font Awesome by Dave Gandy - http://fontawesome.io\n' +
            'Font Awesome licensed under SIL OFL 1.1\n' +
            'http://scripts.sil.org/OFL',
      usage: [ 'sim' ],
      notes: ''
    },
    'has': {
      text: 'has.js Copyright (c) 2010-2013 John David Dalton, Brad Dougherty, Bryan Forbes, Ryan Grove, Andrée Hansson, Peter Higgins, Paul Irish, Weston Ruter, Rick Waldron, Juriy Zaytsev\n' +
            'Tentatively, has.js is available under the Academic Free License, New BSD License, and the MIT License.\n' +
            'https://github.com/phiggins42/has.js/',
      usage: [ 'sim' ],
      notes: '',
      selectedLicense: 'MIT'
    },
    'howler-1.1.11': {
      text: 'howler.js Copyright (c) 2013-2014 James Simpson and GoldFire Studios, Inc.',
      usage: [ 'development' ],
      notes: 'used in vibe/experiments/',
      selectedLicense: 'MIT'
    },
    'iframe-phone-7680a25185': {
      text: 'iframe-phone.js Copyright (c) 2014 Concord Consortium',
      usage: [ 'development' ],
      notes: 'used in codap experiments.  No version was listed, so I used the GitHub git SHA',
      selectedLicense: 'MIT'
    },
    'jquery-2.1.0': {
      text: 'jQuery JavaScript Library v2.1.0 (includes Sizzle.js) Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors\n' +
            'http://jquery.com/\n' +
            'http://sizzlejs.com/\n' +
            'Released under the MIT license\n' +
            'http://jquery.org/license',
      usage: [ 'sim' ]
    },
    'jshint-2.5.0': {
      text: 'Copyright 2012 Anton Kovalyov (http://jshint.com) MIT License, https://github.com/jshint/jshint/blob/master/LICENSE',
      usage: [ 'development' ],
      notes: ''
    },
    'jsondiffpatch-0.1.31': {
      text: 'Copyright (c) 2014 BenjamÌn Eidelman twitter.com/beneidel',
      usage: [ 'sim' ],
      notes: 'Only used for together.js enhanced simulation data features',
      selectedLicense: 'MIT'
    },
    'liberation-sans-regular-subset-numeric-degrees': {
      text: 'Licensed under SIL OFL 1.1\nhttp://scripts.sil.org/OFL',
      usage: [ 'sim' ],
      notes: ''
    },
    'lodash-2.4.1': {
      text: 'Lo-Dash 2.0.0 (Custom Build) <http://lodash.com/>\n' +
            'Build: `lodash modern -o ./dist/lodash.js`\n' +
            'Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>\nBased on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>\n' +
            'Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors\n' +
            'Available under MIT license <http://lodash.com/license>',
      usage: [ 'sim' ],
      notes: ''
    },
    'numeric-1.2.6': {
      text: 'Numeric Javascript\n' +
            'Copyright (C) 2011 by Sébastien Loisel MIT License, https://github.com/sloisel/numeric/blob/master/license.txt',
      usage: [ 'sim' ],
      notes: ''
    },
    'pegjs': {
      text: 'pegjs\n' +
            'Copyright (c) 2010-2012 David Majda\n' +
            'MIT License\n' +
            'http://pegjs.majda.cz/',
      usage: [ 'sim' ],
      notes: ''
    },
    'pixi-v3.0.0-rc1-dev': {
      text: 'pixi.js - v3.0.0-rc1\n' +
            'Copyright (c) 2012-2014, Mat Groves\n' +
            'http://goodboydigital.com/\n',
      usage: [ 'sim' ],
      notes: '',
      selectedLicense: 'MIT'
    },
    'poly2tri-1.3.5.min': {
      text: [
        'Poly2Tri',
        'Copyright (c) 2009-2014, Poly2Tri Contributors',
        'http://code.google.com/p/poly2tri/',
        '',
        'poly2tri.js (JavaScript port)',
        'Copyright (c) 2009-2014, Poly2Tri Contributors',
        'https://github.com/r3mi/poly2tri.js' ].join( '\n' ),
      usage: [ 'sim' ],
      notes: ''
    },
    'qhint': {
      text: 'qHint 1.1 | http://gyoshev.mit-license.org',
      usage: [ 'development' ],
      notes: ''
    },
    'qunit-1.14.0': {
      text: 'QUnit v1.14.0 - A JavaScript Unit Testing Framework\n' +
            '\n' +
            'http://qunitjs.com\n' +
            '\n' +
            'Copyright 2014 jQuery Foundation and other contributors\n' +
            'Released under the MIT license.\n' +
            'https://jquery.org/license/',
      usage: [ 'development' ],
      notes: ''
    },
    'require-2.1.11': {
      text: 'RequireJS 2.1.10 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.\n' +
            'Available via the MIT or new BSD license.\n' +
            'see: http://github.com/jrburke/requirejs for details',
      usage: [],
      notes: '',
      selectedLicense: 'MIT'
    },
    'require-i18n': {
      text: 'RequireJS 2.1.8 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.\n' +
            'Available via the MIT or new BSD license.\n' +
            'see: https://github.com/requirejs/i18n for details',
      usage: [],
      notes: '',
      selectedLicense: 'MIT'
    },
    'rgbcolor': {
      text: 'rgbcolor\n' +
            '- packaged with canvg-1.3\n' +
            'A class to parse color values\n' +
            '@author Stoyan Stefanov <sstoo@gmail.com>\n' +
            '@link   http://www.phpied.com/rgb-color-parser-in-javascript/\n' +
            '@license Use it if you like it',
      usage: [ 'development' ],
      notes: 'only used with canvg'
    },
    'seedrandom-2.2': {
      text: 'seedrandom.js version 2.2.\n' +
            'Copyright 2013 David Bau, all rights reserved.\n' +
            'LICENSE (BSD), https://github.com/davidbau/seedrandom/blob/master/seedrandom.js',
      usage: [ 'sim' ],
      notes: ''
    },
    'stats-r12': {
      text: 'stats.js - Copyright (c) 2009-2014 Mr.doob\n' +
            'MIT License, http://github.com/mrdoob/stats.js',
      usage: [ 'development' ],
      notes: ''
    },
    'syntaxhighlighter-3.0.83': {
      text: 'SyntaxHighlighter\n' +
            'http://alexgorbatchev.com/SyntaxHighlighter\n' +
            '\n' +
            'SyntaxHighlighter is donationware. If you are using it, please donate.\n' +
            'http://alexgorbatchev.com/SyntaxHighlighter/donate.html\n' +
            '\n' +
            '@version\n' +
            '3.0.83 (July 02 2010)\n' +
            '\n' +
            '@copyright\n' +
            'Copyright (C) 2004-2010 Alex Gorbatchev.\n' +
            '\n' +
            '@license\n' +
            'Dual licensed under the MIT and GPL licenses.',
      usage: [ 'docs' ],
      selectedLicense: 'MIT'
    },
    'text': {
      text: 'RequireJS text 2.0.5 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.\n' +
            'Available via the MIT or new BSD license.\n' +
            'http://github.com/requirejs/text for details',
      usage: [ 'sim' ],
      notes: '',
      selectedLicense: 'MIT'
    },
    'text-2.0.12': {
      text: 'RequireJS text 2.0.12 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.\n' +
            'Available via the MIT or new BSD license.\n' +
            'http://github.com/requirejs/text for details',
      usage: [ 'sim' ],
      notes: '',
      selectedLicense: 'MIT'
    },
    'three-r68': {
      text: 'Copyright &copy; 2010-2014 three.js authors',
      usage: [ 'sim' ],
      notes: '',
      selectedLicense: 'MIT'
    },
    'typedarray': {
      text: 'Copyright &copy; 2010 Linden Research, Inc., Copyright &copy; 2014 Joshua Bell',
      usage: [ 'sim' ],
      notes: 'Typed array polyfill',
      selectedLicense: 'MIT'
    },
    'Tween-r12': {
      text: 'tween.js - http://github.com/sole/tween.js\n' +
            'The MIT License\n' +
            'Copyright (c) 2010-2012 Tween.js authors.\n' +
            'Easing equations Copyright (c) 2001 Robert Penner http://robertpenner.com/easing/ under BSD license, see http://robertpenner.com/easing_terms_of_use.html',
      usage: [ 'sim' ],
      notes: ''
    },
    'webgl-debug-2012': {
      text: 'webgl-debug, Various functions for helping debug WebGL apps.\n' +
            'The MIT License\n' +
            'Copyright (c) 2012 The Khronos Group Inc.\n' +
            'https://www.khronos.org/registry/webgl/sdk/debug/webgl-debug.js',
      usage: [ 'development' ],
      notes: ''
    }
  };
  return licenseInfo;
};
