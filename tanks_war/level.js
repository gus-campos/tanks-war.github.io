import * as THREE from 'three';

// Importações do projeto
import { scene, blockSize } from "./main.js"
import { loadModel } from "./extra_lib.js"
import { Block } from "./block.js"

// Constantes
const lampPostModel = await loadModel("assets/lamp_post.glb", 2.5);
const cannonBlocksOffset = -3.5;  

export class Level {

  constructor(matrix, handMatrix, wallColor, floorColor) {

    // Informações do nível
    this.matrix = matrix;
    this.handMatrix = handMatrix;
    this.dimensions = [matrix.length, matrix[0].length];

    // Objetos
    this.plane = this.createPlane(floorColor);
    this.blocks = this.createBlocks(wallColor);
  }

  createPlane(floorColor) {

    // Criando geometria
    var planeGeometry = new THREE.PlaneGeometry((this.dimensions[1]-1)*blockSize, 
                                                (this.dimensions[0]-1)*blockSize, 
                                                40, 40);

    var planeMaterial = new THREE.MeshLambertMaterial({ color: floorColor, side: THREE.DoubleSide });
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    // Tornando o plano horizontal
    plane.rotateX(THREE.MathUtils.degToRad(-90));
    scene.add(plane);

    return plane;
  }

  // Cria todos os blocos do nível
  createBlocks(wallColor) {

    let blocks = [];
    let centralCannonBlock;

    // Criar os blocos necessários
    for (var i=0; i<this.dimensions[0]; i++) {
      for (var j=0; j<this.dimensions[1]; j++) {

        // Para cada item da matriz que representa um bloco
        if (["U","D","L","R","H","*", "C", "c"].indexOf(this.matrix[i][j]) != -1) {

          let block = new Block(this, Level.blockPosition(this, i, j), wallColor);
          block.type = this.matrix[i][j];

          block.hand = (this.handMatrix[i][j] == "X") ? null : this.handMatrix[i][j];
          blocks.push(block);

          // Se for bloco de canhão
          if (block.type == "C" || block.type == "c") {
            
            // Rebaixar sua posição
            block.object.position.y += cannonBlocksOffset;
            // Se for bloco central, guardar sua referência
            if (block.type == "C") centralCannonBlock = block;
          }
        }  
      }
    }

    // Definindo o bloco central do canhão como pai de todod os blocos de canhão
    if (centralCannonBlock != null)
      blocks.forEach(block => {
        if (block.type == "c" || block.type == "C")
          block.parent = centralCannonBlock;
      });

    return blocks;
  }

  static blockPosition(level, i, j) {

    // Encontrando ponto inicial, para que o nível tenha centro em (0,0,0)
    let x0 = -(level.dimensions[1] * blockSize) / 2;
    let z0 = -(level.dimensions[0] * blockSize) / 2;

    // Gerando posição do dado bloco
    let x = x0 + j * blockSize;
    let z = z0 + i * blockSize;

    // Retornando vetor
    return new THREE.Vector3(x, blockSize/2, z);
  }

  static createLampPost(position, rotationAngle) {

    let model = lampPostModel.clone();
    model.position.copy(position);
    model.rotateY(rotationAngle/180 * Math.PI);
    
    // Posição da lâmpada
    let lightPosition = new THREE.Vector3(0,0,0);

    
    model.traverse(function (child) { 
      
      // Mudando material do objeto importado (mantendo cor)
      if (child.material) {
        child.material = new THREE.MeshLambertMaterial({ color: child.material.color, side: THREE.DoubleSide });
        child.material.castShadow = false;
      }
      
      // Pegando posição da lâmpada
      if (child.name == "Light")
        child.getWorldPosition(lightPosition);
    });
    
    position.y = blockSize;
    scene.add(model);

    return lightPosition;
  }

  static createSpotlight(lightPosition, targetPosition) {

    // Holofote
    let spotLight = new THREE.SpotLight("white");
    spotLight.position.copy(lightPosition);

      // Configuração de iluminação do spotlight
      spotLight.intensity = 8;
      spotLight.angle = THREE.MathUtils.degToRad(35);    
      spotLight.decay = 0.01;         // The amount the light dims along the distance of the light. 
      spotLight.penumbra = 0.3;       // Percent of the spotlight cone that is attenuated due to penumbra. 
      
      // Configuração de sombras do spotlight
      spotLight.castShadow = true;
      // Mapa da textura: apenas o tamanho necessária, considerando a distância da qual as sombras são vistas
      spotLight.shadow.mapSize.width = 256;
      spotLight.shadow.mapSize.height = 256;

      // Configurando near e far baseado na distância do spotlight até os outros objetos
      spotLight.shadow.camera.near = 5;
      spotLight.shadow.camera.far = 30;

      // Ajuste do raio, de forma que a sombra fique suave e definida ao mesmo tempo
      spotLight.shadow.radius = 1.8;

    // Mudando sua posição
    spotLight.target.position.copy(targetPosition)
    // Adicionando target
    scene.add(spotLight.target)
    // Adicionando spotlight
    scene.add(spotLight);
  }

  static createBasicLights(ambIntensity, dirInensity) {

    // Luz ambiente
    let ambientLight = new THREE.AmbientLight("white", ambIntensity);
    scene.add(ambientLight);

    // Luz direcional
    let dirLight = new THREE.DirectionalLight("white", dirInensity);
    scene.add(dirLight);
  }

  getSpawns() {

    /*
    Retorna índices de cada spawn de tanque na matriz
    */

    let spawns = {};

    // Encontrar marcadores de spawn
    for (var i=0; i<this.dimensions[0]; i++) 
      for (var j=0; j<this.dimensions[1]; j++) 
        if (["P","A","B"].indexOf(this.matrix[i][j]) != -1)
      
          spawns[this.matrix[i][j]] = Level.blockPosition(this, i, j);

    return spawns;
  }

  getTargets() {

    /*
    Retorna índices de cada alvo de spotlight na matriz
    */

    let targets = [];

    // Encontrar marcadores de spawn
    for (var i=0; i<this.dimensions[0]; i++) 
      for (var j=0; j<this.dimensions[1]; j++) 
        if (this.matrix[i][j] == ".") {
          
          targets.push([i, j]);
        }

    return targets;
  }

  getNest(tankName) {

    /*
    Retorna a posição do ninho de tiro do tanque correspondente
    */

    // Encontrar marcadores de spawn
    for (var i=0; i<this.dimensions[0]; i++) 
      for (var j=0; j<this.dimensions[1]; j++) 
        if (this.matrix[i][j] == tankName.toLowerCase())
          return Level.blockPosition(this, i, j);
  }
}