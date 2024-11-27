import * as THREE from "../build/three.module.js";

// Importações do projeto
import { scene, blockSize, clockDelta } from "./main.js"
import { signedAngle } from "./extra_lib.js"

export class Block {

  constructor(level, position, texture) {

    this.object = this.createGeometry(position, texture);
    this.collider = new THREE.Box3().setFromObject(this.object);
    this.level = level;
    this.type = null;
    this.parent = null;
    this.hand = null;
    this.movable = false;
    this.movingDirection = null;
    this.cumulativeDelta = 0;
    this.speed = 5;
  }

  // ====================================

  updatePosition() {

    /*
    Calcula e faz o deslocamento de um bloco, caso seja móvel
    */

    if (this.movable) {

      let newPosition = this.object.position.clone()
      
      let delta = this.speed * clockDelta;
      this.cumulativeDelta += Math.abs(delta);

      this.object.position.copy(newPosition.add(this.movingDirection.clone().multiplyScalar(delta)))
      this.collider = new THREE.Box3().setFromObject(this.object);
      
      // Inverter direção se delta se acumular o suficiente
      if (this.cumulativeDelta >= 4 * blockSize) {
        this.cumulativeDelta = 0;
        this.movingDirection.z *= -1;
      }
    }
  }

  // ====================================

  createGeometry(position, texture) { 

    /*
    Cria a geometria do bloco
    */

    let material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
      material.map = texture;

    let blockGeometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    let block = new THREE.Mesh(blockGeometry, material);
      block.receiveShadow = true;
      block.castShadow = true;
      block.position.set(position.x, position.y, position.z);
      
    scene.add(block);

    return block;
  }

  dir(reference) {

    /*
    Retorna a direção do bloco, de acordo com a posição passada da referência
    */

    if (this.type == "H") {

      return (reference.x - this.object.position.x > 0) ? "R" : "L";
    }

    // Reflexão múltipla
    else if (["*", "k", "K", "Z", "Y", "W"].includes(this.type)) {

      let centralBlock = (this.type == "k" || this.type == "K") ? this.parent : this;

      let vec1 = new THREE.Vector3(0,0,1);
      let vec2 = reference.clone().add(centralBlock.object.position.clone().multiplyScalar(-1));
      
      let angle = signedAngle(vec1, vec2) * (180/Math.PI);

      // Decidindo direção baseado no ângulo encontrado
      if      (  -45 < angle && angle <   45) return "D"; //  -45 a  45
      else if ( -135 < angle && angle <  -45) return "L"; // -135 a -45
      else if (   45 < angle && angle <  135) return "R"; //   45 a 135
      else                                    return "U";

    }

    // Se for unidirecional
    else return this.type
  }

  dirVec(reference) {

    /*
    Retorna o vetor direção do bloco, de acordo com sua direção.
    */

    switch (this.dir(reference)) {

      case "U":
        return new THREE.Vector3(0,0,1);

      case "D":
        return new THREE.Vector3(0,0,-1);
      
      case "R":
        return new THREE.Vector3(1,0,0);

      case "L":
        return new THREE.Vector3(-1,0,0);
    }
  }
}   