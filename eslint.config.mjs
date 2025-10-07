// Copyright 2024, University of Colorado Boulder

/**
 * ESLint configuration for sherpa.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import strictBooleanExpressionsConfig from '../perennial-alias/js/eslint/config/util/strictBooleanExpressionsConfig.mjs';
import browserEslintConfig from '../perennial-alias/js/eslint/config/browser.eslint.config.mjs';

export default [
  ...browserEslintConfig,
  ...strictBooleanExpressionsConfig,
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
