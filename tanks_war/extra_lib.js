import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';

export async function loadModel(path, scale) {

  // How to use:
  //
  //let path = "assets/toon_tank.glb";
  //let obj = await loader(path, 1.5);
  //scene.add(obj);

  var loader = new GLTFLoader();
  let obj = (await loader.loadAsync(path)).scene;

  obj.traverse( function(child) {
    if(child.isMesh) child.castShadow = true;
    if(child.material) child.material.side = THREE.DoubleSide;
  });
  
  obj.scale.set(scale, scale, scale);

  return obj;
}
  
export function signedAngle(vec1, vec2) {

  // Medindo o ângulo
  let angle = vec1.angleTo(vec2);
  let sign = vec1.clone().cross(vec2).y > 0 ? 1 : -1;

  return sign * angle;
}
  
export function angleBetweenObjects(obj1, obj2, obj3) {

  // Calculando vetores de posição relativa em coordenadas do mundo
  let obj1position = new THREE.Vector3();
  obj1.getWorldPosition(obj1position);

  let obj2position = new THREE.Vector3();
  obj2.getWorldPosition(obj2position);

  let obj3position = new THREE.Vector3();
  obj3.getWorldPosition(obj3position);

  let vec1to2 = obj1position.clone().sub(obj2position)
  let vec3to2 = obj3position.clone().sub(obj2position)
  
  // Encontrando ângulo entre os dois tanques
  return signedAngle(vec1to2, vec3to2)
}