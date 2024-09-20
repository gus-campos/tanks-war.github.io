import * as THREE from  'three';
import Stats from '../build/jsm/libs/stats.module.js';
import {TrackballControls} from '../build/jsm/controls/TrackballControls.js';
import {initRenderer, 
        initCamera, 
        initDefaultSpotlight,
        onWindowResize, 
        lightFollowingCamera} from "../libs/util/util.js";

import KeyboardState from "../libs/util/KeyboardState.js";

var scene = new THREE.Scene();    // Create main scene
var stats = new Stats();          // To show FPS information

var renderer = initRenderer();    // View function in util/utils
var camera = initCamera(new THREE.Vector3(0, 0, 13)); // Init camera in this position
var light = initDefaultSpotlight(scene, new THREE.Vector3(0, 0, 30)); // Use default light

// Keyboard
let keyboard = new KeyboardState();

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

// Enable mouse rotation, pan, zoom etc.
//var trackballControls = new TrackballControls( camera, renderer.domElement );

// Create the cube
let loader = new THREE.TextureLoader();
let geometry = new THREE.BoxGeometry(5, 5, 0.5);
let nmap = loader.load('../assets/textures/NormalMapping/crossNormal.png');
let cubeMaterials = [
    setMaterial('../assets/textures/NormalMapping/crossSide.png', 1, 1),
    setMaterial('../assets/textures/NormalMapping/crossSide.png', 1, 1),
    setMaterial('../assets/textures/NormalMapping/crossTop.png', 1, 1),
    setMaterial('../assets/textures/NormalMapping/crossTop.png', 1, 1),
    setMaterial('../assets/textures/NormalMapping/cross.png', 1, 1, nmap),
    setMaterial('../assets/textures/NormalMapping/cross.png', 1, 1, nmap) 
];




//console.log(cubeMaterials[4].map)// = nmap;
//cubeMaterials[0].normalMap = nmap;
//cubeMaterials[4].normalScale = new THREE.Vector2(1,1);
//cubeMaterials[5].normalScale = new THREE.Vector2(1,1);

let cube = new THREE.Mesh(geometry, cubeMaterials);
scene.add(cube);

render();

// Function to set a texture
function setMaterial(file, repeatU = 1, repeatV = 1, nmap){
   let mat = new THREE.MeshBasicMaterial({ normalMap: nmap});
    mat.map = loader.load(file);
    mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.minFilter = mat.map.magFilter = THREE.LinearFilter;
    mat.map.repeat.set(repeatU,repeatV);
    mat.side = THREE.DoubleSide;

    mat.norma
   return mat;
}

function render()
{

  keyboard.update();
   
  if (keyboard.pressed("W"))  cube.rotateX(-0.1);
  if (keyboard.pressed("S"))  cube.rotateX( 0.1);
  if (keyboard.pressed("A"))  cube.rotateY(-0.1);
  if (keyboard.pressed("D"))  cube.rotateY( 0.1);
  
  stats.update(); // Update FPS
  requestAnimationFrame(render); // Show events
  renderer.render(scene, camera) // Render scene
}
