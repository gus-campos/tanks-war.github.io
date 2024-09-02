import * as THREE from 'three';

// Importações do projeto
import { scene, blockSize } from "./main.js"
import { signedAngle } from "./extra_lib.js"

export class Block {

  constructor(level, position, color) {

    this.object = this.createGeometry(position, color);
    this.collider = new THREE.Box3().setFromObject(this.object);
    this.level = level;
    this.type = null;
    this.parent = null;
    this.hand = null;
  }

  createGeometry(position, color) { 

    // Criando objeto
    let material = new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide });
    let blockGeometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    let block = new THREE.Mesh(blockGeometry, material);
      block.receiveShadow = true;
      block.castShadow = true;


    // Definindo posição e adicionando na cena
    block.position.set(position.x, position.y, position.z);
    scene.add(block);

    return block;
  }

  dir(reference) {

    /*
    Retorna a direção do bloco, e acordo com a posição passada da referência
    */

    // Se for bloco de colisão horizontal
    if (this.type == "H") {

      // Decidir se está do lado direito ou esquerdo
      if (reference.x - this.object.position.x > 0)
        return "R";
      else
        return "L";
    }

    // Se for de reflexão múltipla, calcular ângulo usando a referência, 
    // para descobrir em qual do cubo está sendo tocada
    else if (this.type == "*" || this.type == "c" || this.type == "C") {

      // Se for bloco de canhão, considerar o bloco central como referência, do contrário, usar o próprio bloco
      let centralBlock = (this.type == "c" || this.type == "C") ? this.parent : this;

      // Vetor horizontal e vetor bloco-tanque
      let vec1 = new THREE.Vector3(0,0,1);
      let vec2 = reference.clone().add(centralBlock.object.position.clone().multiplyScalar(-1));
      
      // Ângulo entre eles
      let angle = signedAngle(vec1, vec2) * (180/Math.PI);

      // Decidindo direção baseado no ângulo encontrado
      if      (  -45 < angle && angle <   45) return "D"; //  -45 a  45
      else if ( -135 < angle && angle <  -45) return "L"; // -135 a -45
      else if (   45 < angle && angle <  135) return "R"; //   45 a 135
      else                                    return "U";

    }

    // Se for bloco unidirecional, passar seu tipo, como sendo sua direção
    else return this.type
  }

  dirVec(reference) {

    /*
    Retorna o vetor direção do bloco, de acordo com sua direção
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