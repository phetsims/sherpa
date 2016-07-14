// Copyright 2016, University of Colorado Boulder

(function() {
  'use strict';

  var fs = require( 'fs' );
  var http = require( 'http' );

  // http://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries
  var download = function( url, dest, cb ) {
    var file = fs.createWriteStream( dest );
    http.get( url, function( response ) {
      response.pipe( file );
      file.on( 'finish', function() {
        file.close( cb );  // close() is async, call cb after close completes.
      } );
    } ).on( 'error', function( err ) { // Handle errors
      fs.unlink( dest ); // Delete the file async. (But we don't check the result)
      if ( cb ) {
        cb( err.message );
      }
    } );
  };

  var activeSimsString = fs.readFileSync( '../../chipper/data/active-sims', 'utf-8' ).trim();
  var activeSimsArray = activeSimsString.split( '\n' );
  console.log( activeSimsArray.join( ',' ) );

  for ( var i = 0; i < activeSimsArray.length; i++ ) {
    var sim = activeSimsArray[ i ];
    var url = 'http://phet.colorado.edu/sims/html/' + sim + '/latest/' + sim + '_en.html';
    console.log( url );

    download( url, 'output/' + sim + '_en.html', function() {
      console.log( 'hello' );
    } );
  }

})();