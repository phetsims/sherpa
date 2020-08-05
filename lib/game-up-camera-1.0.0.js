// Copyright 2016 BrainPOP
// Released under MIT License,
// see https://raw.githubusercontent.com/phetsims/sherpa/master/licenses/game-up-camera-1.0.0.js.txt

/**
 * Responds to requests from BrainPOP/Game Up/SnapThought for return images from a PhET simulation.
 * @author BrainPOP
 * @author Vin Rowe
 * @author Sam Reid (PhET Interactive Simulations)
 */

const logging = window.phet.chipper.queryParameters.gameUpLogging;
const isGameUp = window.phet.chipper.queryParameters.gameUp;
const isGameUpTestHarness = window.phet.chipper.queryParameters.gameUpTestHarness;

const log = text => logging && console.log( text );

// Only enable if a query parameter is set
if ( isGameUp ) {

  log( 'Enabled Game Up Camera' );

  const suffix = '.brainpop.com';

  // haven't received word from the parent that captureReady succeeded
  let gameUpCaptureReady = false;

  // Stop checking after 10 times in case we somehow missed the GameUpCaptureReady message
  let numberOfChecks = 0;

  const checkInitialization = () => {

    // haven't received word from the parent that captureReady succeeded
    if ( !gameUpCaptureReady && numberOfChecks < 10 ) {
      parent.postMessage( 'captureReady', '*' );
      numberOfChecks++;

      log( 'Posted captureReady, number of checks: ' + numberOfChecks );
      setTimeout( checkInitialization, 1000 );//try again in a second
    }
  };

  const receiver = event => {
    if ( event.origin.indexOf( suffix, event.origin.length - suffix.length ) !== -1 || isGameUpTestHarness ) {
      if ( event.data === 'captureImage' ) {
        const dataURL = window.phet.joist.ScreenshotGenerator.generateScreenshot( window.phet.joist.sim, 'image/jpeg' );
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

  const sendImage = ( imageString, origin, source ) => {

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