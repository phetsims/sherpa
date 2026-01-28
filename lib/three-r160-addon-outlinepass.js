/**
 * Extracted and ported from THREE.js examples directory
 *
The MIT License

Copyright © 2010-2023 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

 */

class Pass {

	constructor() {

		this.isPass = true;

		// if set to true, the pass is processed by the composer
		this.enabled = true;

		// if set to true, the pass indicates to swap read and write buffer after rendering
		this.needsSwap = true;

		// if set to true, the pass clears its buffer before rendering
		this.clear = false;

		// if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
		this.renderToScreen = false;

	}

	setSize( /* width, height */ ) {}

	render( /* renderer, writeBuffer, readBuffer, deltaTime, maskActive */ ) {

		console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );

	}

	dispose() {}

}

window.ThreePass = Pass;

// Helper for passes that need to fill the viewport with a single quad.

const _camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );

// https://github.com/mrdoob/three.js/pull/21358

class FullscreenTriangleGeometry extends THREE.BufferGeometry {

	constructor() {

		super();

		this.setAttribute( 'position', new THREE.Float32BufferAttribute( [ - 1, 3, 0, - 1, - 1, 0, 3, - 1, 0 ], 3 ) );
		this.setAttribute( 'uv', new THREE.Float32BufferAttribute( [ 0, 2, 0, 0, 2, 0 ], 2 ) );

	}

}

const _geometry = new FullscreenTriangleGeometry();

class FullScreenQuad {

	constructor( material ) {

		this._mesh = new THREE.Mesh( _geometry, material );

	}

	dispose() {

		this._mesh.geometry.dispose();

	}

	render( renderer ) {

		renderer.render( this._mesh, _camera );

	}

	get material() {

		return this._mesh.material;

	}

	set material( value ) {

		this._mesh.material = value;

	}

}

window.ThreeFullScreenQuad = FullScreenQuad;

/**
 * Full-screen textured quad shader
 */

const CopyShader = {

	name: 'CopyShader',

	uniforms: {

		'tDiffuse': { value: null },
		'opacity': { value: 1.0 }

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`

};

window.ThreeCopyShader = CopyShader;

class OutlinePass extends Pass {

	constructor( resolution, scene, camera, selectedObjects ) {

		super();

		this.renderScene = scene;
		this.renderCamera = camera;
		this.selectedObjects = selectedObjects !== undefined ? selectedObjects : [];
		this.visibleEdgeColor = new THREE.Color( 1, 1, 1 );
		this.hiddenEdgeColor = new THREE.Color( 0.1, 0.04, 0.02 );
		this.edgeGlow = 0.0;
		this.usePatternTexture = false;
		this.edgeThickness = 1.0;
		this.edgeStrength = 3.0;
		this.downSampleRatio = 2;
		this.pulsePeriod = 0;

		this._visibilityCache = new Map();


		this.resolution = ( resolution !== undefined ) ? new THREE.Vector2( resolution.x, resolution.y ) : new THREE.Vector2( 256, 256 );

		const resx = Math.round( this.resolution.x / this.downSampleRatio );
		const resy = Math.round( this.resolution.y / this.downSampleRatio );

		this.renderTargetMaskBuffer = new THREE.WebGLRenderTarget( this.resolution.x, this.resolution.y );
		this.renderTargetMaskBuffer.texture.name = 'OutlinePass.mask';
		this.renderTargetMaskBuffer.texture.generateMipmaps = false;

		this.depthMaterial = new THREE.MeshDepthMaterial();
		this.depthMaterial.side = THREE.DoubleSide;
		this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
		this.depthMaterial.blending = THREE.NoBlending;

		this.prepareMaskMaterial = this.getPrepareMaskMaterial();
		this.prepareMaskMaterial.side = THREE.DoubleSide;
		this.prepareMaskMaterial.fragmentShader = replaceDepthToViewZ( this.prepareMaskMaterial.fragmentShader, this.renderCamera );

		this.renderTargetDepthBuffer = new THREE.WebGLRenderTarget( this.resolution.x, this.resolution.y, { type: THREE.HalfFloatType } );
		this.renderTargetDepthBuffer.texture.name = 'OutlinePass.depth';
		this.renderTargetDepthBuffer.texture.generateMipmaps = false;

		this.renderTargetMaskDownSampleBuffer = new THREE.WebGLRenderTarget( resx, resy, { type: THREE.HalfFloatType } );
		this.renderTargetMaskDownSampleBuffer.texture.name = 'OutlinePass.depthDownSample';
		this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps = false;

		this.renderTargetBlurBuffer1 = new THREE.WebGLRenderTarget( resx, resy, { type: THREE.HalfFloatType } );
		this.renderTargetBlurBuffer1.texture.name = 'OutlinePass.blur1';
		this.renderTargetBlurBuffer1.texture.generateMipmaps = false;
		this.renderTargetBlurBuffer2 = new THREE.WebGLRenderTarget( Math.round( resx / 2 ), Math.round( resy / 2 ), { type: THREE.HalfFloatType } );
		this.renderTargetBlurBuffer2.texture.name = 'OutlinePass.blur2';
		this.renderTargetBlurBuffer2.texture.generateMipmaps = false;

		this.edgeDetectionMaterial = this.getEdgeDetectionMaterial();
		this.renderTargetEdgeBuffer1 = new THREE.WebGLRenderTarget( resx, resy, { type: THREE.HalfFloatType } );
		this.renderTargetEdgeBuffer1.texture.name = 'OutlinePass.edge1';
		this.renderTargetEdgeBuffer1.texture.generateMipmaps = false;
		this.renderTargetEdgeBuffer2 = new THREE.WebGLRenderTarget( Math.round( resx / 2 ), Math.round( resy / 2 ), { type: THREE.HalfFloatType } );
		this.renderTargetEdgeBuffer2.texture.name = 'OutlinePass.edge2';
		this.renderTargetEdgeBuffer2.texture.generateMipmaps = false;

		const MAX_EDGE_THICKNESS = 4;
		const MAX_EDGE_GLOW = 4;

		this.separableBlurMaterial1 = this.getSeperableBlurMaterial( MAX_EDGE_THICKNESS );
		this.separableBlurMaterial1.uniforms[ 'texSize' ].value.set( resx, resy );
		this.separableBlurMaterial1.uniforms[ 'kernelRadius' ].value = 1;
		this.separableBlurMaterial2 = this.getSeperableBlurMaterial( MAX_EDGE_GLOW );
		this.separableBlurMaterial2.uniforms[ 'texSize' ].value.set( Math.round( resx / 2 ), Math.round( resy / 2 ) );
		this.separableBlurMaterial2.uniforms[ 'kernelRadius' ].value = MAX_EDGE_GLOW;

		// Overlay material
		this.overlayMaterial = this.getOverlayMaterial();

		// copy material

		const copyShader = CopyShader;

		this.copyUniforms = THREE.UniformsUtils.clone( copyShader.uniforms );

		this.materialCopy = new THREE.ShaderMaterial( {
			uniforms: this.copyUniforms,
			vertexShader: copyShader.vertexShader,
			fragmentShader: copyShader.fragmentShader,
			blending: THREE.NoBlending,
			depthTest: false,
			depthWrite: false
		} );

		this.enabled = true;
		this.needsSwap = false;

		this._oldClearColor = new THREE.Color();
		this.oldClearAlpha = 1;

		this.fsQuad = new FullScreenQuad( null );

		this.tempPulseColor1 = new THREE.Color();
		this.tempPulseColor2 = new THREE.Color();
		this.textureMatrix = new THREE.Matrix4();

		function replaceDepthToViewZ( string, camera ) {

			const type = camera.isPerspectiveCamera ? 'perspective' : 'orthographic';

			return string.replace( /DEPTH_TO_VIEW_Z/g, type + 'DepthToViewZ' );

		}

	}

	dispose() {

		this.renderTargetMaskBuffer.dispose();
		this.renderTargetDepthBuffer.dispose();
		this.renderTargetMaskDownSampleBuffer.dispose();
		this.renderTargetBlurBuffer1.dispose();
		this.renderTargetBlurBuffer2.dispose();
		this.renderTargetEdgeBuffer1.dispose();
		this.renderTargetEdgeBuffer2.dispose();

		this.depthMaterial.dispose();
		this.prepareMaskMaterial.dispose();
		this.edgeDetectionMaterial.dispose();
		this.separableBlurMaterial1.dispose();
		this.separableBlurMaterial2.dispose();
		this.overlayMaterial.dispose();
		this.materialCopy.dispose();

		this.fsQuad.dispose();

	}

	setSize( width, height ) {

		this.renderTargetMaskBuffer.setSize( width, height );
		this.renderTargetDepthBuffer.setSize( width, height );

		let resx = Math.round( width / this.downSampleRatio );
		let resy = Math.round( height / this.downSampleRatio );
		this.renderTargetMaskDownSampleBuffer.setSize( resx, resy );
		this.renderTargetBlurBuffer1.setSize( resx, resy );
		this.renderTargetEdgeBuffer1.setSize( resx, resy );
		this.separableBlurMaterial1.uniforms[ 'texSize' ].value.set( resx, resy );

		resx = Math.round( resx / 2 );
		resy = Math.round( resy / 2 );

		this.renderTargetBlurBuffer2.setSize( resx, resy );
		this.renderTargetEdgeBuffer2.setSize( resx, resy );

		this.separableBlurMaterial2.uniforms[ 'texSize' ].value.set( resx, resy );

	}

	changeVisibilityOfSelectedObjects( bVisible ) {

		const cache = this._visibilityCache;

		function gatherSelectedMeshesCallBack( object ) {

			if ( object.isMesh ) {

				if ( bVisible === true ) {

					object.visible = cache.get( object );

				} else {

					cache.set( object, object.visible );
					object.visible = bVisible;

				}

			}

		}

		for ( let i = 0; i < this.selectedObjects.length; i ++ ) {

			const selectedObject = this.selectedObjects[ i ];
			selectedObject.traverse( gatherSelectedMeshesCallBack );

		}

	}

	changeVisibilityOfNonSelectedObjects( bVisible ) {

		const cache = this._visibilityCache;
		const selectedMeshes = [];

		function gatherSelectedMeshesCallBack( object ) {

			if ( object.isMesh ) selectedMeshes.push( object );

		}

		for ( let i = 0; i < this.selectedObjects.length; i ++ ) {

			const selectedObject = this.selectedObjects[ i ];
			selectedObject.traverse( gatherSelectedMeshesCallBack );

		}

		function VisibilityChangeCallBack( object ) {

			if ( object.isMesh || object.isSprite ) {

				// only meshes and sprites are supported by OutlinePass

				let bFound = false;

				for ( let i = 0; i < selectedMeshes.length; i ++ ) {

					const selectedObjectId = selectedMeshes[ i ].id;

					if ( selectedObjectId === object.id ) {

						bFound = true;
						break;

					}

				}

				if ( bFound === false ) {

					const visibility = object.visible;

					if ( bVisible === false || cache.get( object ) === true ) {

						object.visible = bVisible;

					}

					cache.set( object, visibility );

				}

			} else if ( object.isPoints || object.isLine ) {

				// the visibilty of points and lines is always set to false in order to
				// not affect the outline computation

				if ( bVisible === true ) {

					object.visible = cache.get( object ); // restore

				} else {

					cache.set( object, object.visible );
					object.visible = bVisible;

				}

			}

		}

		this.renderScene.traverse( VisibilityChangeCallBack );

	}

	updateTextureMatrix() {

		this.textureMatrix.set( 0.5, 0.0, 0.0, 0.5,
			0.0, 0.5, 0.0, 0.5,
			0.0, 0.0, 0.5, 0.5,
			0.0, 0.0, 0.0, 1.0 );
		this.textureMatrix.multiply( this.renderCamera.projectionMatrix );
		this.textureMatrix.multiply( this.renderCamera.matrixWorldInverse );

	}

	render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

		if ( this.selectedObjects.length > 0 ) {

			renderer.getClearColor( this._oldClearColor );
			this.oldClearAlpha = renderer.getClearAlpha();
			const oldAutoClear = renderer.autoClear;

			renderer.autoClear = false;

			if ( maskActive ) renderer.state.buffers.stencil.setTest( false );

			renderer.setClearColor( 0xffffff, 1 );

			// Make selected objects invisible
			this.changeVisibilityOfSelectedObjects( false );

			const currentBackground = this.renderScene.background;
			this.renderScene.background = null;

			// 1. Draw Non Selected objects in the depth buffer
			this.renderScene.overrideMaterial = this.depthMaterial;
			renderer.setRenderTarget( this.renderTargetDepthBuffer );
			renderer.clear();
			renderer.render( this.renderScene, this.renderCamera );

			// Make selected objects visible
			this.changeVisibilityOfSelectedObjects( true );
			this._visibilityCache.clear();

			// Update Texture Matrix for Depth compare
			this.updateTextureMatrix();

			// Make non selected objects invisible, and draw only the selected objects, by comparing the depth buffer of non selected objects
			this.changeVisibilityOfNonSelectedObjects( false );
			this.renderScene.overrideMaterial = this.prepareMaskMaterial;
			this.prepareMaskMaterial.uniforms[ 'cameraNearFar' ].value.set( this.renderCamera.near, this.renderCamera.far );
			this.prepareMaskMaterial.uniforms[ 'depthTexture' ].value = this.renderTargetDepthBuffer.texture;
			this.prepareMaskMaterial.uniforms[ 'textureMatrix' ].value = this.textureMatrix;
			renderer.setRenderTarget( this.renderTargetMaskBuffer );
			renderer.clear();
			renderer.render( this.renderScene, this.renderCamera );
			this.renderScene.overrideMaterial = null;
			this.changeVisibilityOfNonSelectedObjects( true );
			this._visibilityCache.clear();

			this.renderScene.background = currentBackground;

			// 2. Downsample to Half resolution
			this.fsQuad.material = this.materialCopy;
			this.copyUniforms[ 'tDiffuse' ].value = this.renderTargetMaskBuffer.texture;
			renderer.setRenderTarget( this.renderTargetMaskDownSampleBuffer );
			renderer.clear();
			this.fsQuad.render( renderer );

			this.tempPulseColor1.copy( this.visibleEdgeColor );
			this.tempPulseColor2.copy( this.hiddenEdgeColor );

			if ( this.pulsePeriod > 0 ) {

				const scalar = ( 1 + 0.25 ) / 2 + Math.cos( performance.now() * 0.01 / this.pulsePeriod ) * ( 1.0 - 0.25 ) / 2;
				this.tempPulseColor1.multiplyScalar( scalar );
				this.tempPulseColor2.multiplyScalar( scalar );

			}

			// 3. Apply Edge Detection Pass
			this.fsQuad.material = this.edgeDetectionMaterial;
			this.edgeDetectionMaterial.uniforms[ 'maskTexture' ].value = this.renderTargetMaskDownSampleBuffer.texture;
			this.edgeDetectionMaterial.uniforms[ 'texSize' ].value.set( this.renderTargetMaskDownSampleBuffer.width, this.renderTargetMaskDownSampleBuffer.height );
			this.edgeDetectionMaterial.uniforms[ 'visibleEdgeColor' ].value = this.tempPulseColor1;
			this.edgeDetectionMaterial.uniforms[ 'hiddenEdgeColor' ].value = this.tempPulseColor2;
			renderer.setRenderTarget( this.renderTargetEdgeBuffer1 );
			renderer.clear();
			this.fsQuad.render( renderer );

			// 4. Apply Blur on Half res
			this.fsQuad.material = this.separableBlurMaterial1;
			this.separableBlurMaterial1.uniforms[ 'colorTexture' ].value = this.renderTargetEdgeBuffer1.texture;
			this.separableBlurMaterial1.uniforms[ 'direction' ].value = OutlinePass.BlurDirectionX;
			this.separableBlurMaterial1.uniforms[ 'kernelRadius' ].value = this.edgeThickness;
			renderer.setRenderTarget( this.renderTargetBlurBuffer1 );
			renderer.clear();
			this.fsQuad.render( renderer );
			this.separableBlurMaterial1.uniforms[ 'colorTexture' ].value = this.renderTargetBlurBuffer1.texture;
			this.separableBlurMaterial1.uniforms[ 'direction' ].value = OutlinePass.BlurDirectionY;
			renderer.setRenderTarget( this.renderTargetEdgeBuffer1 );
			renderer.clear();
			this.fsQuad.render( renderer );

			// Apply Blur on quarter res
			this.fsQuad.material = this.separableBlurMaterial2;
			this.separableBlurMaterial2.uniforms[ 'colorTexture' ].value = this.renderTargetEdgeBuffer1.texture;
			this.separableBlurMaterial2.uniforms[ 'direction' ].value = OutlinePass.BlurDirectionX;
			renderer.setRenderTarget( this.renderTargetBlurBuffer2 );
			renderer.clear();
			this.fsQuad.render( renderer );
			this.separableBlurMaterial2.uniforms[ 'colorTexture' ].value = this.renderTargetBlurBuffer2.texture;
			this.separableBlurMaterial2.uniforms[ 'direction' ].value = OutlinePass.BlurDirectionY;
			renderer.setRenderTarget( this.renderTargetEdgeBuffer2 );
			renderer.clear();
			this.fsQuad.render( renderer );

			// Blend it additively over the input texture
			this.fsQuad.material = this.overlayMaterial;
			this.overlayMaterial.uniforms[ 'maskTexture' ].value = this.renderTargetMaskBuffer.texture;
			this.overlayMaterial.uniforms[ 'edgeTexture1' ].value = this.renderTargetEdgeBuffer1.texture;
			this.overlayMaterial.uniforms[ 'edgeTexture2' ].value = this.renderTargetEdgeBuffer2.texture;
			this.overlayMaterial.uniforms[ 'patternTexture' ].value = this.patternTexture;
			this.overlayMaterial.uniforms[ 'edgeStrength' ].value = this.edgeStrength;
			this.overlayMaterial.uniforms[ 'edgeGlow' ].value = this.edgeGlow;
			this.overlayMaterial.uniforms[ 'usePatternTexture' ].value = this.usePatternTexture;


			if ( maskActive ) renderer.state.buffers.stencil.setTest( true );

			renderer.setRenderTarget( readBuffer );
			this.fsQuad.render( renderer );

			renderer.setClearColor( this._oldClearColor, this.oldClearAlpha );
			renderer.autoClear = oldAutoClear;

		}

		if ( this.renderToScreen ) {

			this.fsQuad.material = this.materialCopy;
			this.copyUniforms[ 'tDiffuse' ].value = readBuffer.texture;
			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );

		}

	}

	getPrepareMaskMaterial() {

		return new THREE.ShaderMaterial( {

			uniforms: {
				'depthTexture': { value: null },
				'cameraNearFar': { value: new THREE.Vector2( 0.5, 0.5 ) },
				'textureMatrix': { value: null }
			},

			vertexShader:
				`#include <morphtarget_pars_vertex>
				#include <skinning_pars_vertex>

				varying vec4 projTexCoord;
				varying vec4 vPosition;
				uniform mat4 textureMatrix;

				void main() {

					#include <skinbase_vertex>
					#include <begin_vertex>
					#include <morphtarget_vertex>
					#include <skinning_vertex>
					#include <project_vertex>

					vPosition = mvPosition;

					vec4 worldPosition = vec4( transformed, 1.0 );

					#ifdef USE_INSTANCING

						worldPosition = instanceMatrix * worldPosition;

					#endif
					
					worldPosition = modelMatrix * worldPosition;

					projTexCoord = textureMatrix * worldPosition;

				}`,

			fragmentShader:
				`#include <packing>
				varying vec4 vPosition;
				varying vec4 projTexCoord;
				uniform sampler2D depthTexture;
				uniform vec2 cameraNearFar;

				void main() {

					float depth = unpackRGBAToDepth(texture2DProj( depthTexture, projTexCoord ));
					float viewZ = - DEPTH_TO_VIEW_Z( depth, cameraNearFar.x, cameraNearFar.y );
					float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;
					gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);

				}`

		} );

	}

	getEdgeDetectionMaterial() {

		return new THREE.ShaderMaterial( {

			uniforms: {
				'maskTexture': { value: null },
				'texSize': { value: new THREE.Vector2( 0.5, 0.5 ) },
				'visibleEdgeColor': { value: new THREE.Vector3( 1.0, 1.0, 1.0 ) },
				'hiddenEdgeColor': { value: new THREE.Vector3( 1.0, 1.0, 1.0 ) },
			},

			vertexShader:
				`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,

			fragmentShader:
				`varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform vec2 texSize;
				uniform vec3 visibleEdgeColor;
				uniform vec3 hiddenEdgeColor;

				void main() {
					vec2 invSize = 1.0 / texSize;
					vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);
					vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy);
					vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy);
					vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw);
					vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw);
					float diff1 = (c1.r - c2.r)*0.5;
					float diff2 = (c3.r - c4.r)*0.5;
					float d = length( vec2(diff1, diff2) );
					float a1 = min(c1.g, c2.g);
					float a2 = min(c3.g, c4.g);
					float visibilityFactor = min(a1, a2);
					vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleEdgeColor : hiddenEdgeColor;
					gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);
				}`
		} );

	}

	getSeperableBlurMaterial( maxRadius ) {

		return new THREE.ShaderMaterial( {

			defines: {
				'MAX_RADIUS': maxRadius,
			},

			uniforms: {
				'colorTexture': { value: null },
				'texSize': { value: new THREE.Vector2( 0.5, 0.5 ) },
				'direction': { value: new THREE.Vector2( 0.5, 0.5 ) },
				'kernelRadius': { value: 1.0 }
			},

			vertexShader:
				`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,

			fragmentShader:
				`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;
				uniform float kernelRadius;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}

				void main() {
					vec2 invSize = 1.0 / texSize;
					float sigma = kernelRadius/2.0;
					float weightSum = gaussianPdf(0.0, sigma);
					vec4 diffuseSum = texture2D( colorTexture, vUv) * weightSum;
					vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);
					vec2 uvOffset = delta;
					for( int i = 1; i <= MAX_RADIUS; i ++ ) {
						float x = kernelRadius * float(i) / float(MAX_RADIUS);
						float w = gaussianPdf(x, sigma);
						vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);
						vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);
						diffuseSum += ((sample1 + sample2) * w);
						weightSum += (2.0 * w);
						uvOffset += delta;
					}
					gl_FragColor = diffuseSum/weightSum;
				}`
		} );

	}

	getOverlayMaterial() {

		return new THREE.ShaderMaterial( {

			uniforms: {
				'maskTexture': { value: null },
				'edgeTexture1': { value: null },
				'edgeTexture2': { value: null },
				'patternTexture': { value: null },
				'edgeStrength': { value: 1.0 },
				'edgeGlow': { value: 1.0 },
				'usePatternTexture': { value: 0.0 }
			},

			vertexShader:
				`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,

			fragmentShader:
				`varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform sampler2D edgeTexture1;
				uniform sampler2D edgeTexture2;
				uniform sampler2D patternTexture;
				uniform float edgeStrength;
				uniform float edgeGlow;
				uniform bool usePatternTexture;

				void main() {
					vec4 edgeValue1 = texture2D(edgeTexture1, vUv);
					vec4 edgeValue2 = texture2D(edgeTexture2, vUv);
					vec4 maskColor = texture2D(maskTexture, vUv);
					vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);
					float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;
					vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;
					vec4 finalColor = edgeStrength * maskColor.r * edgeValue;
					if(usePatternTexture)
						finalColor += + visibilityFactor * (1.0 - maskColor.r) * (1.0 - patternColor.r);
					gl_FragColor = finalColor;
				}`,
			blending: THREE.NormalBlending,
			depthTest: false,
			depthWrite: false,
			transparent: true
		} );

	}

}

OutlinePass.BlurDirectionX = new THREE.Vector2( 1.0, 0.0 );
OutlinePass.BlurDirectionY = new THREE.Vector2( 0.0, 1.0 );

window.ThreeOutlinePass = OutlinePass;


class ShaderPass extends Pass {

	constructor( shader, textureID ) {

		super();

		this.textureID = ( textureID !== undefined ) ? textureID : 'tDiffuse';

		if ( shader instanceof THREE.ShaderMaterial ) {

			this.uniforms = shader.uniforms;

			this.material = shader;

		} else if ( shader ) {

			this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

			this.material = new THREE.ShaderMaterial( {

				name: ( shader.name !== undefined ) ? shader.name : 'unspecified',
				defines: Object.assign( {}, shader.defines ),
				uniforms: this.uniforms,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader

			} );

		}

		this.fsQuad = new FullScreenQuad( this.material );

	}

	render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this.fsQuad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );

		} else {

			renderer.setRenderTarget( writeBuffer );
			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			this.fsQuad.render( renderer );

		}

	}

	dispose() {

		this.material.dispose();

		this.fsQuad.dispose();

	}

}

class MaskPass extends Pass {

	constructor( scene, camera ) {

		super();

		this.scene = scene;
		this.camera = camera;

		this.clear = true;
		this.needsSwap = false;

		this.inverse = false;

	}

	render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

		const context = renderer.getContext();
		const state = renderer.state;

		// don't update color or depth

		state.buffers.color.setMask( false );
		state.buffers.depth.setMask( false );

		// lock buffers

		state.buffers.color.setLocked( true );
		state.buffers.depth.setLocked( true );

		// set up stencil

		let writeValue, clearValue;

		if ( this.inverse ) {

			writeValue = 0;
			clearValue = 1;

		} else {

			writeValue = 1;
			clearValue = 0;

		}

		state.buffers.stencil.setTest( true );
		state.buffers.stencil.setOp( context.REPLACE, context.REPLACE, context.REPLACE );
		state.buffers.stencil.setFunc( context.ALWAYS, writeValue, 0xffffffff );
		state.buffers.stencil.setClear( clearValue );
		state.buffers.stencil.setLocked( true );

		// draw into the stencil buffer

		renderer.setRenderTarget( readBuffer );
		if ( this.clear ) renderer.clear();
		renderer.render( this.scene, this.camera );

		renderer.setRenderTarget( writeBuffer );
		if ( this.clear ) renderer.clear();
		renderer.render( this.scene, this.camera );

		// unlock color and depth buffer and make them writable for subsequent rendering/clearing

		state.buffers.color.setLocked( false );
		state.buffers.depth.setLocked( false );

		state.buffers.color.setMask( true );
		state.buffers.depth.setMask( true );

		// only render where stencil is set to 1

		state.buffers.stencil.setLocked( false );
		state.buffers.stencil.setFunc( context.EQUAL, 1, 0xffffffff ); // draw if == 1
		state.buffers.stencil.setOp( context.KEEP, context.KEEP, context.KEEP );
		state.buffers.stencil.setLocked( true );

	}

}

class ClearMaskPass extends Pass {

	constructor() {

		super();

		this.needsSwap = false;

	}

	render( renderer /*, writeBuffer, readBuffer, deltaTime, maskActive */ ) {

		renderer.state.buffers.stencil.setLocked( false );
		renderer.state.buffers.stencil.setTest( false );

	}

}





class EffectComposer {

	constructor( renderer, renderTarget ) {

		this.renderer = renderer;

		this._pixelRatio = renderer.getPixelRatio();

		if ( renderTarget === undefined ) {

			const size = renderer.getSize( new THREE.Vector2() );
			this._width = size.width;
			this._height = size.height;

			renderTarget = new THREE.WebGLRenderTarget( this._width * this._pixelRatio, this._height * this._pixelRatio, { type: THREE.HalfFloatType } );
			renderTarget.texture.name = 'EffectComposer.rt1';

		} else {

			this._width = renderTarget.width;
			this._height = renderTarget.height;

		}

		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();
		this.renderTarget2.texture.name = 'EffectComposer.rt2';

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

		this.renderToScreen = true;

		this.passes = [];

		this.copyPass = new ShaderPass( CopyShader );
		this.copyPass.material.blending = THREE.NoBlending;

		this.clock = new THREE.Clock();

	}

	swapBuffers() {

		const tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;

	}

	addPass( pass ) {

		this.passes.push( pass );
		pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

	}

	insertPass( pass, index ) {

		this.passes.splice( index, 0, pass );
		pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

	}

	removePass( pass ) {

		const index = this.passes.indexOf( pass );

		if ( index !== - 1 ) {

			this.passes.splice( index, 1 );

		}

	}

	isLastEnabledPass( passIndex ) {

		for ( let i = passIndex + 1; i < this.passes.length; i ++ ) {

			if ( this.passes[ i ].enabled ) {

				return false;

			}

		}

		return true;

	}

	render( deltaTime ) {

		// deltaTime value is in seconds

		if ( deltaTime === undefined ) {

			deltaTime = this.clock.getDelta();

		}

		const currentRenderTarget = this.renderer.getRenderTarget();

		let maskActive = false;

		for ( let i = 0, il = this.passes.length; i < il; i ++ ) {

			const pass = this.passes[ i ];

			if ( pass.enabled === false ) continue;

			pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
			pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );

			if ( pass.needsSwap ) {

				if ( maskActive ) {

					const context = this.renderer.getContext();
					const stencil = this.renderer.state.buffers.stencil;

					//context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );
					stencil.setFunc( context.NOTEQUAL, 1, 0xffffffff );

					this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime );

					//context.stencilFunc( context.EQUAL, 1, 0xffffffff );
					stencil.setFunc( context.EQUAL, 1, 0xffffffff );

				}

				this.swapBuffers();

			}

			if ( MaskPass !== undefined ) {

				if ( pass instanceof MaskPass ) {

					maskActive = true;

				} else if ( pass instanceof ClearMaskPass ) {

					maskActive = false;

				}

			}

		}

		this.renderer.setRenderTarget( currentRenderTarget );

	}

	reset( renderTarget ) {

		if ( renderTarget === undefined ) {

			const size = this.renderer.getSize( new THREE.Vector2() );
			this._pixelRatio = this.renderer.getPixelRatio();
			this._width = size.width;
			this._height = size.height;

			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

		}

		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

	}

	setSize( width, height ) {

		this._width = width;
		this._height = height;

		const effectiveWidth = this._width * this._pixelRatio;
		const effectiveHeight = this._height * this._pixelRatio;

		this.renderTarget1.setSize( effectiveWidth, effectiveHeight );
		this.renderTarget2.setSize( effectiveWidth, effectiveHeight );

		for ( let i = 0; i < this.passes.length; i ++ ) {

			this.passes[ i ].setSize( effectiveWidth, effectiveHeight );

		}

	}

	setPixelRatio( pixelRatio ) {

		this._pixelRatio = pixelRatio;

		this.setSize( this._width, this._height );

	}

	dispose() {

		this.renderTarget1.dispose();
		this.renderTarget2.dispose();

		this.copyPass.dispose();

	}

}

window.ThreeEffectComposer = EffectComposer;


class RenderPass extends Pass {

	constructor( scene, camera, overrideMaterial = null, clearColor = null, clearAlpha = null ) {

		super();

		this.scene = scene;
		this.camera = camera;

		this.overrideMaterial = overrideMaterial;

		this.clearColor = clearColor;
		this.clearAlpha = clearAlpha;

		this.clear = true;
		this.clearDepth = false;
		this.needsSwap = false;
		this._oldClearColor = new THREE.Color();

	}

	render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

		const oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		let oldClearAlpha, oldOverrideMaterial;

		if ( this.overrideMaterial !== null ) {

			oldOverrideMaterial = this.scene.overrideMaterial;

			this.scene.overrideMaterial = this.overrideMaterial;

		}

		if ( this.clearColor !== null ) {

			renderer.getClearColor( this._oldClearColor );
			renderer.setClearColor( this.clearColor );

		}

		if ( this.clearAlpha !== null ) {

			oldClearAlpha = renderer.getClearAlpha();
			renderer.setClearAlpha( this.clearAlpha );

		}

		if ( this.clearDepth == true ) {

			renderer.clearDepth();

		}

		renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );

		if ( this.clear === true ) {

			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );

		}

		renderer.render( this.scene, this.camera );

		// restore

		if ( this.clearColor !== null ) {

			renderer.setClearColor( this._oldClearColor );

		}

		if ( this.clearAlpha !== null ) {

			renderer.setClearAlpha( oldClearAlpha );

		}

		if ( this.overrideMaterial !== null ) {

			this.scene.overrideMaterial = oldOverrideMaterial;

		}

		renderer.autoClear = oldAutoClear;

	}

}

window.ThreeRenderPass = RenderPass;







const OutputShader = {

	name: 'OutputShader',

	uniforms: {

		'tDiffuse': { value: null },
		'toneMappingExposure': { value: 1 }

	},

	vertexShader: /* glsl */`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = OptimizedCineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`

};

class OutputPass extends Pass {

	constructor() {

		super();

		//

		const shader = OutputShader;

		this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

		this.material = new THREE.RawShaderMaterial( {
			name: shader.name,
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader
		} );

		this.fsQuad = new FullScreenQuad( this.material );

		// internal cache

		this._outputColorSpace = null;
		this._toneMapping = null;

	}

	render( renderer, writeBuffer, readBuffer/*, deltaTime, maskActive */ ) {

		this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
		this.uniforms[ 'toneMappingExposure' ].value = renderer.toneMappingExposure;

		// rebuild defines if required

		if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {

			this._outputColorSpace = renderer.outputColorSpace;
			this._toneMapping = renderer.toneMapping;

			this.material.defines = {};

			if ( THREE.ColorManagement.getTransfer( this._outputColorSpace ) === THREE.SRGBTransfer ) this.material.defines.SRGB_TRANSFER = '';

			if ( this._toneMapping === THREE.LinearToneMapping ) this.material.defines.LINEAR_TONE_MAPPING = '';
			else if ( this._toneMapping === THREE.ReinhardToneMapping ) this.material.defines.REINHARD_TONE_MAPPING = '';
			else if ( this._toneMapping === THREE.CineonToneMapping ) this.material.defines.CINEON_TONE_MAPPING = '';
			else if ( this._toneMapping === THREE.ACESFilmicToneMapping ) this.material.defines.ACES_FILMIC_TONE_MAPPING = '';
			else if ( this._toneMapping === THREE.AgXToneMapping ) this.material.defines.AGX_TONE_MAPPING = '';

			this.material.needsUpdate = true;

		}

		//

		if ( this.renderToScreen === true ) {

			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );

		} else {

			renderer.setRenderTarget( writeBuffer );
			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			this.fsQuad.render( renderer );

		}

	}

	dispose() {

		this.material.dispose();
		this.fsQuad.dispose();

	}

}

window.ThreeOutputPass = OutputPass;

/**
*
* Supersample Anti-Aliasing Render Pass
*
* This manual approach to SSAA re-renders the scene ones for each sample with camera jitter and accumulates the results.
*
* References: https://en.wikipedia.org/wiki/Supersampling
*
*/

class SSAARenderPass extends Pass {

	constructor( scene, camera, clearColor, clearAlpha ) {

		super();

		this.scene = scene;
		this.camera = camera;

		this.sampleLevel = 4; // specified as n, where the number of samples is 2^n, so sampleLevel = 4, is 2^4 samples, 16.
		this.unbiased = true;

		// as we need to clear the buffer in this pass, clearColor must be set to something, defaults to black.
		this.clearColor = ( clearColor !== undefined ) ? clearColor : 0x000000;
		this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0;
		this._oldClearColor = new THREE.Color();

		const copyShader = CopyShader;
		this.copyUniforms = THREE.UniformsUtils.clone( copyShader.uniforms );

		this.copyMaterial = new THREE.ShaderMaterial(	{
			uniforms: this.copyUniforms,
			vertexShader: copyShader.vertexShader,
			fragmentShader: copyShader.fragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			premultipliedAlpha: true,
			blending: THREE.AdditiveBlending
		} );

		this.fsQuad = new FullScreenQuad( this.copyMaterial );

	}

	dispose() {

		if ( this.sampleRenderTarget ) {

			this.sampleRenderTarget.dispose();
			this.sampleRenderTarget = null;

		}

		this.copyMaterial.dispose();

		this.fsQuad.dispose();

	}

	setSize( width, height ) {

		if ( this.sampleRenderTarget )	this.sampleRenderTarget.setSize( width, height );

	}

	render( renderer, writeBuffer, readBuffer ) {

		if ( ! this.sampleRenderTarget ) {

			this.sampleRenderTarget = new THREE.WebGLRenderTarget( readBuffer.width, readBuffer.height, { type: THREE.HalfFloatType } );
			this.sampleRenderTarget.texture.name = 'SSAARenderPass.sample';

		}

		const jitterOffsets = _JitterVectors[ Math.max( 0, Math.min( this.sampleLevel, 5 ) ) ];

		const autoClear = renderer.autoClear;
		renderer.autoClear = false;

		renderer.getClearColor( this._oldClearColor );
		const oldClearAlpha = renderer.getClearAlpha();

		const baseSampleWeight = 1.0 / jitterOffsets.length;
		const roundingRange = 1 / 32;
		this.copyUniforms[ 'tDiffuse' ].value = this.sampleRenderTarget.texture;

		const viewOffset = {

			fullWidth: readBuffer.width,
			fullHeight: readBuffer.height,
			offsetX: 0,
			offsetY: 0,
			width: readBuffer.width,
			height: readBuffer.height

		};

		const originalViewOffset = Object.assign( {}, this.camera.view );

		if ( originalViewOffset.enabled ) Object.assign( viewOffset, originalViewOffset );

		// render the scene multiple times, each slightly jitter offset from the last and accumulate the results.
		for ( let i = 0; i < jitterOffsets.length; i ++ ) {

			const jitterOffset = jitterOffsets[ i ];

			if ( this.camera.setViewOffset ) {

				this.camera.setViewOffset(

					viewOffset.fullWidth, viewOffset.fullHeight,

					viewOffset.offsetX + jitterOffset[ 0 ] * 0.0625, viewOffset.offsetY + jitterOffset[ 1 ] * 0.0625, // 0.0625 = 1 / 16

					viewOffset.width, viewOffset.height

				);

			}

			let sampleWeight = baseSampleWeight;

			if ( this.unbiased ) {

				// the theory is that equal weights for each sample lead to an accumulation of rounding errors.
				// The following equation varies the sampleWeight per sample so that it is uniformly distributed
				// across a range of values whose rounding errors cancel each other out.

				const uniformCenteredDistribution = ( - 0.5 + ( i + 0.5 ) / jitterOffsets.length );
				sampleWeight += roundingRange * uniformCenteredDistribution;

			}

			this.copyUniforms[ 'opacity' ].value = sampleWeight;
			renderer.setClearColor( this.clearColor, this.clearAlpha );
			renderer.setRenderTarget( this.sampleRenderTarget );
			renderer.clear();
			renderer.render( this.scene, this.camera );

			renderer.setRenderTarget( this.renderToScreen ? null : writeBuffer );

			if ( i === 0 ) {

				renderer.setClearColor( 0x000000, 0.0 );
				renderer.clear();

			}

			this.fsQuad.render( renderer );

		}

		if ( this.camera.setViewOffset && originalViewOffset.enabled ) {

			this.camera.setViewOffset(

				originalViewOffset.fullWidth, originalViewOffset.fullHeight,

				originalViewOffset.offsetX, originalViewOffset.offsetY,

				originalViewOffset.width, originalViewOffset.height

			);

		} else if ( this.camera.clearViewOffset ) {

			this.camera.clearViewOffset();

		}

		renderer.autoClear = autoClear;
		renderer.setClearColor( this._oldClearColor, oldClearAlpha );

	}

}


// These jitter vectors are specified in integers because it is easier.
// I am assuming a [-8,8) integer grid, but it needs to be mapped onto [-0.5,0.5)
// before being used, thus these integers need to be scaled by 1/16.
//
// Sample patterns reference: https://msdn.microsoft.com/en-us/library/windows/desktop/ff476218%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
const _JitterVectors = [
	[
		[ 0, 0 ]
	],
	[
		[ 4, 4 ], [ - 4, - 4 ]
	],
	[
		[ - 2, - 6 ], [ 6, - 2 ], [ - 6, 2 ], [ 2, 6 ]
	],
	[
		[ 1, - 3 ], [ - 1, 3 ], [ 5, 1 ], [ - 3, - 5 ],
		[ - 5, 5 ], [ - 7, - 1 ], [ 3, 7 ], [ 7, - 7 ]
	],
	[
		[ 1, 1 ], [ - 1, - 3 ], [ - 3, 2 ], [ 4, - 1 ],
		[ - 5, - 2 ], [ 2, 5 ], [ 5, 3 ], [ 3, - 5 ],
		[ - 2, 6 ], [ 0, - 7 ], [ - 4, - 6 ], [ - 6, 4 ],
		[ - 8, 0 ], [ 7, - 4 ], [ 6, 7 ], [ - 7, - 8 ]
	],
	[
		[ - 4, - 7 ], [ - 7, - 5 ], [ - 3, - 5 ], [ - 5, - 4 ],
		[ - 1, - 4 ], [ - 2, - 2 ], [ - 6, - 1 ], [ - 4, 0 ],
		[ - 7, 1 ], [ - 1, 2 ], [ - 6, 3 ], [ - 3, 3 ],
		[ - 7, 6 ], [ - 3, 6 ], [ - 5, 7 ], [ - 1, 7 ],
		[ 5, - 7 ], [ 1, - 6 ], [ 6, - 5 ], [ 4, - 4 ],
		[ 2, - 3 ], [ 7, - 2 ], [ 1, - 1 ], [ 4, - 1 ],
		[ 2, 1 ], [ 6, 2 ], [ 0, 4 ], [ 4, 4 ],
		[ 2, 5 ], [ 7, 5 ], [ 5, 6 ], [ 3, 7 ]
	]
];

window.ThreeSSAARenderPass = SSAARenderPass;