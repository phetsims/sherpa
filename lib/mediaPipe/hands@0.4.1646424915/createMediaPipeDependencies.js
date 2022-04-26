// Copyright 2022, University of Colorado Boulder

/**
 * Script to download all dynamic files from MediaPipe for using hand input, writing them to a file to be used by the sim.
 *
 * run with `./node createMediaPipeDependencies.js`
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

/* eslint-env node */

const fs = require( 'fs' );
const axios = require( 'axios' );

const HANDS_VERSION = '0.4.1646424915';

( async () => {

  const files = [
    'hand_landmark_full.tflite',
    'hands.binarypb',
    'hands_solution_packed_assets.data',
    'hands_solution_packed_assets_loader.js',
    'hands_solution_simd_wasm_bin.js',
    'hands_solution_simd_wasm_bin.wasm'
  ];

  const mediaPipeDependencies = {};
  const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${HANDS_VERSION}/`;

  const getContent = async ( url ) => {

    const response = await axios( {
      url: url,
      method: 'GET',
      responseType: 'arraybuffer'
    } );

    const headers = response.headers;

    const dataURLPrefix = `data:${headers[ 'content-type' ].split( ';' )[ 0 ]};base64,`;
    const base64 = Buffer.from( response.data ).toString( 'base64' );
    return `${dataURLPrefix}${base64}`;
  };
  let count = 0;

  const attempToWrite = () => {
    if ( ++count === files.length ) {

      fs.writeFileSync( './mediaPipeDependencies.js', `
  
  window.mediaPipeDependencies = ${JSON.stringify( mediaPipeDependencies, null, 2 )};
  ` );
    }
  };

  for ( let i = 0; i < files.length; i++ ) {
    const filename = files[ i ];

    // A timeout prevents a bug with HTTP. TODO: can I get rid of this?  https://github.com/phetsims/tangible/issues/9
    setTimeout( async () => { // eslint-disable-line
      mediaPipeDependencies[ filename ] = await getContent( `${url}${filename}` );

      attempToWrite();
    }, i + 2000 );
  }
} )();
