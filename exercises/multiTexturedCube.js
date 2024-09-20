import * as THREE from  'three';
import Stats from '../build/jsm/libs/stats.module.js';
import {TrackballControls} from '../build/jsm/controls/TrackballControls.js';
import {initRenderer, 
        initCamera, 
        initDefaultSpotlight,
        onWindowResize, 
        lightFollowingCamera} from "../libs/util/util.js";

var scene = new THREE.Scene();    // Create main scene
var stats = new Stats();          // To show FPS information

var renderer = initRenderer();    // View function in util/utils
var camera = initCamera(new THREE.Vector3(10, 10, 10)); // Init camera in this position
var light = initDefaultSpotlight(scene, new THREE.Vector3(0, 0, 30)); // Use default light

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

// Enable mouse rotation, pan, zoom etc.
var trackballControls = new TrackballControls( camera, renderer.domElement );

// Create the cube
let loader = new THREE.TextureLoader();
let geometry = new THREE.BoxGeometry(5, 5, 5);
let cubeMaterials = [
   setMaterial('../assets/textures/tiles.jpg', 1/3, 1/3, 0,    0),   // (0,0)
   setMaterial('../assets/textures/tiles.jpg', 1/3, 1/3, 0,    1/3), // (0,1)
   setMaterial('../assets/textures/tiles.jpg', 1/3, 1/3, 1/3,  0),   // (1,0)
   setMaterial('../assets/textures/tiles.jpg', 1/3, 1/3, 1/3,  1/3), // (1,1)
   setMaterial('../assets/textures/tiles.jpg', 1/3, 1/3, 2/3,  0),   // (2,0)
   setMaterial('../assets/textures/tiles.jpg', 1/3, 1/3, 2/3,  1/3)  // (2,1)
];
let cube = new THREE.Mesh(geometry, cubeMaterials);
scene.add(cube);

// To access textures individually, you should use their indexes
console.log(cube.material[0].map)

render();

// Function to set a texture
function setMaterial(file, repeatU = 1, repeatV = 1, offsetX=0, offsetY=0,color = 'rgb(255,255,255)'){
   let mat = new THREE.MeshBasicMaterial({ map: loader.load(file), color:color});
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
      mat.map.minFilter = mat.map.magFilter = THREE.LinearFilter;
      mat.map.repeat.set(repeatU,repeatV); 
      mat.map.offset.set(offsetX, offsetY);

      //mat.map.minFilter = mat.map.magFilter = THREE.LinearFilter;
   return mat;
}

function render()
{
  stats.update(); // Update FPS
  trackballControls.update();
  lightFollowingCamera(light, camera) // Makes light follow the camera
  requestAnimationFrame(render); // Show events
  renderer.render(scene, camera) // Render scene
}
