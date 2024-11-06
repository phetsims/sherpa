// Copyright 2024, University of Colorado Boulder

/**
 * ESLint configuration for sherpa.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import browserEslintConfig from '../perennial-alias/js/eslint/config/browser.eslint.config.mjs';

export default [
  ...browserEslintConfig,
  {
    ignores: [
      'lib/',
      'katex/',
      'licenses/',
      'mathjax/',
      'mermaid/',
      'js/fontawesome-4/',
      'js/fontawesome-5/',
      'js/fontawesome-5/brands/'
    ]
  }
];