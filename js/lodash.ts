// Copyright 2024, University of Colorado Boulder

/**
 * Central point to load lodash in PhET code. It bundles the lodash-es modules with the type information from @types.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
import type * as LodashNS from '../../perennial-alias/node_modules/@types/lodash/index.js';
import lodash from '../lodash-es/lodash.js';

export default lodash as unknown as LodashNS.LoDashStatic;