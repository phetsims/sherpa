  // Fragment of code included with the packaged CSS JS. Assumes 'css' variable contains the CSS string, and the
  // usedFontData object are both defined in scope.

  // Create a stylesheet for the CSS and add it to the HTML head
  var style = document.createElement( 'style' );
  style.type = 'text/css';
  if ( style.styleSheet ) { style.styleSheet.cssText = css; } else { style.appendChild( document.createTextNode( css ) ); };
  document.head.appendChild( style );

  // Create a hidden div with spans for each used font, and append it to the body. This will trigger the preloading
  // of the base64 embedded font file into memory, so that there is no flash of unstyled content (FOUC), which
  // in Scenery's case would give you incorrect bounds in FormulaNode.
  var fontPreloadDiv = document.createElement( 'div' );
  fontPreloadDiv.style.opacity = 0;
  fontPreloadDiv.style.position = 'absolute';
  fontPreloadDiv.style.left = '0';
  fontPreloadDiv.style.top = '0';
  fontPreloadDiv.style.width = '0';
  fontPreloadDiv.style.height = '0';
  fontPreloadDiv.style.clip = 'rect(0,0,0,0)';
  fontPreloadDiv.setAttribute( 'aria-hidden', true );
  usedFontData.forEach( function( font ) {
    var span = document.createElement( 'span' );
    span.innerHTML = 'preload';
    span.style.fontFamily = font.family;
    span.style.fontWeight = font.weight;
    span.style.fontStyle = font.style;
    fontPreloadDiv.appendChild( span );
  } );
  document.body.appendChild( fontPreloadDiv );
