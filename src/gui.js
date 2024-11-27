import * as THREE from "../build/three.module.js";
import { camera, scene } from "./main.js";

const barWidth = 5;
const barHeight = 0.5;

export class Bar {
  constructor(tank, offset) {

    this.rate;
    this.offset = offset;
    this.color = tank.mainColor;
    this.id;
    this.filling;
    
    this.tank = tank;
    this.background = this.createBackground();
    this.filling = this.createFilling(0.3);
  }

  createBackground() {

    /*
    Cria geometria do background e adiciona a cena
    */

    var planeGeometry = new THREE.PlaneGeometry(barHeight+0.3, barWidth+0.3, 40, 40);
    var planeMaterial = new THREE.MeshBasicMaterial({ color: "darkgrey", side: THREE.DoubleSide });
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = false;

    scene.add(plane);

    return plane;
  }

  createFilling(rate) {

    /*
    Cria geometria do preenchimento e adiciona a cena
    */

    var planeGeometry = new THREE.PlaneGeometry(barHeight, rate*barWidth, 40, 40);
    var planeMaterial = new THREE.MeshBasicMaterial({ color: this.color });
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = false;

    this.background.add(plane);
    
    // Posicionando de forma que tenha a devida aparência
    plane.position.z += 0.01;
    plane.position.y -=  0.5*barWidth - rate*barWidth/2;

    return plane;
  }

  update() {

    /*
    Atualiza a posição e preenchimento dos elementos
    */

    // Posição
    this.background.position.copy(this.tank.object.position)
    this.background.position.y = 7;

    // Rotação (olhando para a câmera)
    this.background.rotation.x = camera.rotation.x;
    this.background.rotation.y = -camera.rotation.y;
    this.background.rotation.z = -Math.PI/2;

    // Limitando o valor do preenchimento
    let rate = this.tank.life/10;
    rate = (rate < 0) ? 0 : rate;
    rate = (rate > 1) ? 1 : rate;

    // Substituindo filling
    this.background.remove(this.filling);
    this.filling = this.createFilling(rate);
  } 
}
