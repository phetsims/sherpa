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
      usage: ['docs'],
      selectedLicense: 'MIT'
    },
    'almond-0.2.6': {
      text: 'almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.\n' +
            'Available via the MIT or new BSD license.\n' +
            'see: http://github.com/jrburke/almond for details',
      usage: ['sim'],
      selectedLicense: 'MIT'
    },
    'benchmark-1.0.0': {
      text: 'Benchmark.js v1.0.0 <http://benchmarkjs.com/>\n' +
            'Copyright 2010-2012 Mathias Bynens <http://mths.be/>\n' +
            'Based on JSLitmus.js, copyright Robert Kieffer <http://broofa.com/>\n' +
            'Modified by John-David Dalton <http://allyoucanleet.com/>\n' +
            'Available under MIT license <http://mths.be/mit>',
      usage: ['development']
    },
    'bootstrap-2.2.2': {
      text: 'Bootstrap v2.2.2\n' +
            '\n' +
            'Copyright 2012 Twitter, Inc\n' +
            'Licensed under the Apache License v2.0\n' +
            'http://www.apache.org/licenses/LICENSE-2.0\n' +
            '\n' +
            'Designed and built with all the love in the world @twitter by @mdo and @fat.',
      usage: ['docs'],
      notes: ''
    },
    'canvg-1.2': {
      text: 'canvg.js - Javascript SVG parser and renderer on Canvas\n' +
            'MIT Licensed\n' +
            'Gabe Lerner (gabelerner@gmail.com)\n' +
            'http://code.google.com/p/canvg/\n' +
            '\n' +
            'Requires: rgbcolor.js - http://www.phpied.com/rgb-color-parser-in-javascript/',
      usage: ['development'],
      notes: 'used in scenery unit tests, may be used in sims later on if we convert SVG=>canvas'
    },
    'easeljs-0.5.0.min.js': {
      text: 'EaselJS\n' +
            'Visit http://createjs.com/ for documentation, updates and examples.\n' +
            '\n' +
            'Copyright (c) 2011 gskinner.com, inc.\n' +
            '\n' +
            'Distributed under the terms of the MIT license.\n' +
            'http://www.opensource.org/licenses/mit-license.html\n' +
            '\n' +
            'This notice shall be included in all copies or substantial portions of the Software.',
      usage: ['development'],
      notes: ''
    },
    'font-awesome': {
      text: 'Font Awesome 3.2.1 · Created and Maintained by Dave Gandy\n' +
            'Font Awesome licensed under SIL OFL 1.1\n' +
            'http://scripts.sil.org/OFL',
      usage: ['sim'],
      notes: ''
    },
    'has': {
      text: 'has.js, Tentatively, has.js is available under the Academic Free License, New BSD License, and the MIT License.\n' +
            'https://github.com/phiggins42/has.js/',
      usage: ['sim'],
      notes: '',
      selectedLicense: 'MIT'
    },
    'i18n-2.0.4': {
      text: 'RequireJS i18n 2.0.4 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.\n' +
            'Available via the MIT or new BSD license.\n' +
            'see: http://github.com/requirejs/i18n for details',
      usage: ['sim'],
      notes: '',
      selectedLicense: 'MIT'
    },
    'jquery.mobile-1.3.1': {
      text: 'jQuery Mobile 1.3.1 | Git HEAD hash: 74b4bec <> 2013-04-08T19:41:28Z | (c) 2010, 2013 jQuery Foundation, Inc. | jquery.org/license',
      usage: ['development'],
      notes: ''
    },
    'jquery-2.0.3': {
      text: 'jQuery JavaScript Library v2.0.n\n' +
            'http://jquery.com/\n' +
            '\n' +
            'Includes Sizzle.js\n' +
            'http://sizzlejs.com/\n' +
            '\n' +
            'Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors\nReleased under the MIT license\n' +
            'http://jquery.org/license',
      usage: ['sim']
    },
    'jshint-2.1.2': {
      text: 'Copyright 2012 Anton Kovalyov (http://jshint.com) MIT License, https://github.com/jshint/jshint/blob/master/LICENSE',
      usage: ['development'],
      notes: ''},
    'lodash-2.0.0': {
      text: 'Lo-Dash 2.0.0 (Custom Build) <http://lodash.com/>\n' +
            'Build: `lodash modern -o ./dist/lodash.js`\n' +
            'Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>\nBased on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>\n' +
            'Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors\n' +
            'Available under MIT license <http://lodash.com/license>',
      usage: ['sim'],
      notes: ''},
    'numeric-1.2.6': {
      text: 'Numeric Javascript\n' +
            'Copyright (C) 2011 by Sébastien Loisel MIT License, https://github.com/sloisel/numeric/blob/master/license.txt',
      usage: ['sim'],
      notes: ''},
    'pegjs': {
      text: 'pegjs\n' +
            'Copyright (c) 2010-2012 David Majda\n' +
            'MIT License\n' +
            'http://pegjs.majda.cz/',
      usage: ['sim'],
      notes: ''
    },
    'qhint': {
      text: 'qHint 1.0 | http://gyoshev.mit-license.org',
      usage: ['development'],
      notes: ''
    },
    'qunit-1.12.0': {
      text: 'QUnit v1.12.0 - A JavaScript Unit Testing Framework\n' +
            '\n' +
            'http://qunitjs.com\n' +
            '\n' +
            'Copyright 2013 jQuery Foundation and other contributors\n' +
            'Released under the MIT license.\n' +
            'https://jquery.org/license/',
      usage: ['development'],
      notes: ''
    },
    'require-2.1.8': {
      text: 'RequireJS 2.1.8 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.\n' +
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
            '- packaged with canvg-1.2\n' +
            'A class to parse color values\n' +
            '@author Stoyan Stefanov <sstoo@gmail.com>\n' +
            '@link   http://www.phpied.com/rgb-color-parser-in-javascript/\n' +
            '@license Use it if you like it',
      usage: ['development'],
      notes: 'only used with canvg'
    },
    'seedrandom-2.2': {
      text: 'seedrandom.js version 2.2.\n' +
            'Copyright 2013 David Bau, all rights reserved.\n' +
            'LICENSE (BSD), https://github.com/davidbau/seedrandom/blob/master/seedrandom.js',
      usage: ['sim'],
      notes: ''
    },
    'stats.min': {
      text: 'stats.js - Copyright (c) 2009-2012 Mr.doob\n' +
            'MIT License, http://github.com/mrdoob/stats.js',
      usage: ['development'],
      notes: ''
    }
  };
  return licenseInfo;
};