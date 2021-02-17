// Copyright 2021, University of Colorado Boulder

/**
 * Thin wrapper for Font Awesome icons, which provides the following features:
 * 1. A central point for usage by individual icons
 * 2. A place for documentation about how to set up and use Font Awesome icons
 * 3. A placeholder in case we change default options or shape manipulation in the future
 *
 * Font Awesome icons have been ported to modules using modulifyFontAwesomeIcons.js, please see that file
 * for details on the generation process.
 *
 * The icon files are located in
 * fontawesome-5/brands
 * fontawesome-5/regular
 * fontawesome-5/solid
 *
 * The directory name fontawesome-5 only specifies the major version in case we want to upgrade to a new
 * minor or maintenance version "in place"
 *
 * Sample usage:
 * this.addChild( new AddressBook({
 *   fill: 'blue',
 *   maxWidth: 100
 * }) );
 *
 * Note that most font awesome icons have a height of 512, and varying widths, you will need to size them accordingly
 * for your context.
 *
 * Also, the path data is provided separately in case it is needed in a different context:
 * new Shape( AddressBook.PATH_DATA )
 *
 * A list of all icon constructors is provided by iconList.js, which can be used for testing.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import Path from '../../../scenery/js/nodes/Path.js';
import sun from '../../../sun/js/sun.js';

class FANode extends Path {

  /**
   * @param {Shape} shape
   * @param {Object} [options]
   */
  constructor( shape, options ) {
    super( shape, options );
  }
}

sun.register( 'FANode', FANode );
export default FANode;