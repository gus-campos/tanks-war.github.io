import * as THREE from 'three';
import GUI from '../libs/util/dat.gui.module.js'
import { ARjs }    from  '../libs/AR/ar.js';
import {GLTFLoader} from '../build/jsm/loaders/GLTFLoader.js';
import { initDefaultSpotlight,
         initDefaultBasicLight,
         initRenderer,
         getMaxSize,
         getFilename,
         createGroundPlaneXZ
      } from "../libs/util/util.js";

// init scene and camera
let scene, camera, renderer, light;
renderer = initRenderer();
   renderer.setClearColor(new THREE.Color('lightgrey'), 0)   
scene	= new THREE.Scene();
camera = new THREE.Camera();
   scene.add(camera);

initDefaultBasicLight(scene, false)
light = initDefaultSpotlight(scene, new THREE.Vector3(-5,5,0));
light.intensity = 300

// Set AR Stuff
let AR = {
   source: null,
   context: null,
}

var clock = new THREE.Clock();
var mixer = new Array();

setARStuff();

window.addEventListener('resize', function(){ onResize() })

//----------------------------------------------------------------------------

function normalizeAndRescale(obj, newScale)
{
  var scale = getMaxSize(obj); // Available in 'utils.js'
  obj.scale.set(newScale * (1.0/scale),
                newScale * (1.0/scale),
                newScale * (1.0/scale));
  return obj;
}

function fixPosition(obj)
{
  // Fix position of the object over the ground plane
  var box = new THREE.Box3().setFromObject( obj );
  if(box.min.y > 0)
    obj.translateY(-box.min.y);
  else
    obj.translateY(-1*box.min.y);
  return obj;
}

function loadGLBFile(modelPath, modelName, desiredScale, angle, visibility)
{
   var loader = new GLTFLoader( );
   loader.load( modelPath + modelName + '.glb', function ( gltf ) {
      var obj = gltf.scene;
      obj.visible = visibility;
      obj.name = getFilename(modelName);
      obj.traverse( function (child)
      {
         if( child.isMesh ) child.castShadow = true;
         if( child.material ) child.material.side = THREE.DoubleSide; 
      });

      var obj = normalizeAndRescale(obj, desiredScale);
      var obj = fixPosition(obj);
      obj.rotateY(THREE.MathUtils.degToRad(angle));

      scene.add(obj);

      // Create animationMixer and push it in the array of mixers
      var mixerLocal = new THREE.AnimationMixer(obj);
      mixerLocal.clipAction(gltf.animations[0]).play();
      mixer.push(mixerLocal);
   });
}

loadGLBFile('../assets/objects/', "dog", 3.0, 0, true);
let plane = createGroundPlaneXZ(3,3)
plane.material.transparent = true; 
plane.material.opacity = 0.3; 
scene.add(plane)

//----------------------------------------------------------------------------
// Render the whole thing on the page
render();

function render()
{

   // Relógio
   let delta = clock.getDelta(); 

   // Animador
   for(var i = 0; i<mixer.length; i++)
      mixer[i].update(delta);

   updateAR(); 
   requestAnimationFrame(render);
   renderer.render(scene, camera) // Render scene
}

function updateAR()
{
   if(AR.source)
   {
      if( AR.source.ready === false )	return
      AR.context.update( AR.source.domElement )
      scene.visible = camera.visible   
   }
}

function onResize(){
	AR.source.onResizeElement()
	AR.source.copyElementSizeTo(renderer.domElement)
	if( AR.context.arController !== null ){
		AR.source.copyElementSizeTo(AR.context.arController.canvas)
	}
}

function setARStuff()
{
   //----------------------------------------------------------------------------
   // Handle arToolkitSource
   // More info: https://ar-js-org.github.io/AR.js-Docs/marker-based/
   AR.source = new ARjs.Source({	
      // to read from a video
      sourceType : 'video',
      sourceUrl : '../assets/AR/kanjiScene.mp4'
   })
   
   AR.source.init(function onReady(){
      setTimeout(() => {
         onResize()
      }, 100);
   })
   
   //----------------------------------------------------------------------------
   // initialize arToolkitContext
   AR.context = new ARjs.Context({
      cameraParametersUrl: '../libs/AR/data/camera_para.dat',
      detectionMode: 'mono',
   })
   
   // initialize it
   AR.context.init(function onCompleted(){
      camera.projectionMatrix.copy( AR.context.getProjectionMatrix() );
   })
   
   //----------------------------------------------------------------------------
   // Create a ArMarkerControls
   let markerControls = new ARjs.MarkerControls(AR.context, camera, {	
      type : 'pattern',
      patternUrl : '../libs/AR/data/patt.kanji',
      changeMatrixMode: 'cameraTransformMatrix' // as we controls the camera, set changeMatrixMode: 'cameraTransformMatrix'
   })
   // as we do changeMatrixMode: 'cameraTransformMatrix', start with invisible scene
   scene.visible = false   
}