// Copyright 2021, University of Colorado Boulder
// @author Michael Kauzmann (PhET Interactive Simulations)

'use strict';

// Use this file since sherpa doesn't have a package.json to embed this line into.
module.exports = {
  extends: '../chipper/eslint/.eslintrc.js',
  ignorePatterns: [
    'lib/',
    'katex/',
    'licenses/',
    'js/fontawesome-4/',
    'js/fontawesome-5/brands/',
    'js/fontawesome-5/regular/',
    'js/fontawesome-5/solid/'
  ]
};