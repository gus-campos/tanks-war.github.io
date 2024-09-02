import * as THREE from 'three';
import { camera, scene } from "./main.js";

const barWidth = 5;
const barHeight = 0.5;

export class Bar {
  constructor(tank, offset) {

    // Atributos gerais
    this.rate;
    this.offset = offset;
    this.color = tank.mainColor;
    this.id;
    this.filling;
    
    // Objetos
    this.tank = tank;
    this.background = this.createBackground();
    this.filling = this.createFilling(0.3);
  }

  createBackground() {

    // Criando geometria
    var planeGeometry = new THREE.PlaneGeometry(barHeight+0.3, barWidth+0.3, 40, 40);
    var planeMaterial = new THREE.MeshBasicMaterial({ color: "darkgrey", side: THREE.DoubleSide });
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = false;

    // Adicionando à cena
    scene.add(plane);

    return plane;
  }

  createFilling(rate) {

    // Criando geometria
    var planeGeometry = new THREE.PlaneGeometry(barHeight, rate*barWidth, 40, 40);
    var planeMaterial = new THREE.MeshBasicMaterial({ color: this.color });
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = false;

    // Adicionando ao background
    this.background.add(plane);
    
    // Posicionando acima do background
    plane.position.z += 0.01;
    
    // Posicionando de forma que o início das barras coincida 
    plane.position.y -=  0.5*barWidth - rate*barWidth/2;

    return plane;
  }

  update() {

    // Copiando posição do tanque
    this.background.position.copy(this.tank.object.position)
    this.background.position.y = 7;

    // Copiando rotação da câmera
    this.background.rotation.x = camera.rotation.x;
    this.background.rotation.y = -camera.rotation.y;
    this.background.rotation.z = -Math.PI/2;

    // Limitando e atualizando enchimento
    let rate = this.tank.life/10
    rate = (rate<0) ? 0 : (rate>1 ? 1:rate);

    // Removendo filling anterior
    this.background.remove(this.filling);
    // Criando um novo com razão correta
    this.filling = this.createFilling(rate);
  } 
}
