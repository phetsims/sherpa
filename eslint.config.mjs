// Copyright 2024, University of Colorado Boulder

/**
 * ESlint configuration for sherpa.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import parent from '../chipper/eslint/root.eslint.config.mjs';

export default [
  ...parent,
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