// Copyright 2016 BrainPOP
// Released under MIT License,
// see https://raw.githubusercontent.com/phetsims/sherpa/master/licenses/game-up-camera-1.0.0.js.txt
(function() {
  'use strict';

  // Only enable if a query parameter is set
  if ( window.phet.chipper.getQueryParameter( 'gameUp' ) ) {

    console && console.log && console.log( 'Enabled Game Up Camera' );

    var suffix = '.brainpop.com';

    // haven't received word from the parent that captureReady succeeded
    var gameUpCaptureReady = false;

    var checkInitialization = function() {

      // haven't received word from the parent that captureReady succeeded
      if ( !gameUpCaptureReady ) {
        parent.postMessage( 'captureReady', '*' );
        setTimeout( checkInitialization, 1000 );//try again in a second
      }
    };

    var receiver = function( event ) {
      if ( event.origin.indexOf( suffix, event.origin.length - suffix.length ) !== -1 ) {
        if ( event.data === 'captureImage' ) {
          var dataURL = window.phet.joist.ScreenshotGenerator.generateScreenshot( window.phet.joist.sim );
          sendImage( dataURL, event.origin, event.source );
        }
        else if ( event.data === 'GameUpCaptureReady' ) {

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