// Copyright 2016 BrainPOP
// Released under MIT License,
// see https://raw.githubusercontent.com/phetsims/sherpa/master/licenses/game-up-camera-1.0.0.js.txt

/**
 * Responds to requests from BrainPOP/Game Up/SnapThought for return images from a PhET simulation.
 * @author BrainPOP
 * @author Vin Rowe
 * @author Sam Reid (PhET Interactive Simulations)
 */
(function() {
  'use strict';

  var logging = window.phet.chipper.queryParameters.gameUpLogging;
  var isGameUp = window.phet.chipper.queryParameters.gameUp;

  var log = function( text ) {
    logging && console.log( text );
  };

  // Only enable if a query parameter is set
  if ( isGameUp ) {

    log( 'Enabled Game Up Camera' );

    var suffix = '.brainpop.com';

    // haven't received word from the parent that captureReady succeeded
    var gameUpCaptureReady = false;

    // Stop checking after 10 times in case we somehow missed the GameUpCaptureReady message
    var numberOfChecks = 0;

    var checkInitialization = function() {

      // haven't received word from the parent that captureReady succeeded
      if ( !gameUpCaptureReady && numberOfChecks < 10 ) {
        parent.postMessage( 'captureReady', '*' );
        numberOfChecks++;

        log( 'Posted captureReady, number of checks: ' + numberOfChecks );
        setTimeout( checkInitialization, 1000 );//try again in a second
      }
    };

    var receiver = function( event ) {
      if ( event.origin.indexOf( suffix, event.origin.length - suffix.length ) !== -1 ) {
        if ( event.data === 'captureImage' ) {
          var dataURL = window.phet.joist.ScreenshotGenerator.generateScreenshot( window.phet.joist.sim, 'image/jpeg' );
          sendImage( dataURL, event.origin, event.source );

          log( 'Sent image' );
        }
        else if ( event.data === 'GameUpCaptureReady' ) {

          log( 'GameUpCaptureReady' );

          // TODO: post captureReady from here

          //captureReady succeeded
          gameUpCaptureReady = true;
        }
      }
    };

    var sendImage = function( imageString, origin, source ) {

      //capture.js already appends this, so we end up with two
      imageString = imageString.replace( 'data:image/jpeg;base64,', '' );

      //send it back
      source.postMessage( imageString, origin );
    };

    if ( window.addEventListener ) {
      window.addEventListener( 'message', receiver, false );
    }
    else if ( window.attachEvent ) {
      window.attachEvent( 'onmessage', receiver );
    }

    // Call captureReady, function will recall itself until gameUpCaptureReady
    checkInitialization();
  }
})();