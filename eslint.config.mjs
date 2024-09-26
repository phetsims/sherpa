// Copyright 2024, University of Colorado Boulder

/**
 * ESLint configuration for sherpa.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import rootEslintConfig from '../chipper/eslint/root.eslint.config.mjs';

export default [
  ...rootEslintConfig,
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