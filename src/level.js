import * as THREE from "../build/three.module.js";

// Importações do projeto
import { scene, blockSize, clockDelta } from "./main.js"
import { loadModel } from "./extra_lib.js"
import { Block } from "./block.js"

// => Constantes

const lampPostModel = await loadModel("assets/geometries/lamp_post.glb", 2.5);

const blocksSpeed = {
  "W" : 5,
  "Y" : 4,
  "Z" : 3
}

// => TEXTURAS

let textureLoader = new THREE.TextureLoader();

const wallTextures = [

  textureLoader.load("assets/textures/crates_of_future/ab_crate_a.png"),
  textureLoader.load("assets/textures/crates_of_future/ab_crate_b.png"),
  textureLoader.load("assets/textures/crates_of_future/ab_crate_d.png"),
  textureLoader.load("assets/textures/city/Tileable1b.png")
];

const floorTextures = [

  textureLoader.load("assets/textures/city/Tileable9f.png"),
  textureLoader.load("assets/textures/city/Tileable8d.png"),
  textureLoader.load("assets/textures/city/Tileable10j.png")
];

const cannonBlocksOffset = -3.5;  

const PowerUpTypes = {
  Heal: 0,
  DamageBoost: 1
}

const powerUpHeight = 2.3;
const powerUpTime = 10;
const distanceCriteria = 4;

class PowerUp {

  constructor(powerUpType, position) {

    this.type = powerUpType;
    this.object = this.createGeometry(position);
    this.active = true;
    this.timer = powerUpTime;
  }

  createGeometry(position) {

    /*
    Cria geometria do power up
    */

    if (this.type == PowerUpTypes.Heal) {

      const geometry = new THREE.CapsuleGeometry(0.5, 1.5, 10, 10); 
      const material = new THREE.MeshLambertMaterial({color: "darkblue"}); 
        material.emissive.set(material.color);
        material.emissiveIntensity = 0.3;

      const obj = new THREE.Mesh(geometry, material); 
      
      // Inclinando objeto
      obj.rotateX(Math.PI/4)
      
      // Ajustando posição
      let parent = new THREE.Mesh()
      position.y = powerUpHeight;
      parent.position.copy(position);

      obj.castShadow = true;
      
      parent.add(obj)
      scene.add(parent);
      return parent;
    }

    else if (this.type == PowerUpTypes.DamageBoost) {

      const geometry = new THREE.IcosahedronGeometry(1.2, 0); 
      const material = new THREE.MeshLambertMaterial({color: "red"}); 
        material.emissive.set(material.color);
        material.emissiveIntensity = 0.3;

      const obj = new THREE.Mesh(geometry, material); 
      
      // Ajustando posição
      position.y = powerUpHeight;
      obj.position.copy(position);

      obj.castShadow = true;
    
      scene.add(obj);
      return obj;
    }
  }

  update(player) {

    /*
    Atualiza a animação, duração do efeito e destruição do objeto
    */

    // Animação de rotação
    this.object.rotateY(clockDelta * 0.8);

    // Atualizar timer se power up estiver desativado
    if (!this.active)
      this.timer -= clockDelta;

    let distanceFromPlayer = this.object.position.distanceTo(player.object.position);

    if (distanceFromPlayer < distanceCriteria && this.active) {
      this.applyEfect(player);
      this.destroy();
    }

    if (player.damageBoosted && this.timer < 0) {
      player.damageBoosted = false;
    }
  }

  applyEfect(player) {
    
    if (this.type == PowerUpTypes.Heal)
      this.heal(player);

    else if (this.type == PowerUpTypes.DamageBoost)
      this.boostDamage(player);
  }

  destroy() {
    this.active = false;
    scene.remove(this.object)
  }

  boostDamage(player) {
    player.damageBoosted = true;
  }

  heal(player) {
    player.life = (player.life+2 > 10) ? 10 : (player.life+2);
  }
}

export class Level {

  constructor(levelIndex, matrix, handMatrix) {

    // Inicializando primeiro power up
    this.powerUp = new PowerUp(PowerUpTypes.DamageBoost, new THREE.Vector3(0,0,0));
    this.powerUp.timer = -1;
    this.powerUp.type = Math.random() > 0.5;
    this.powerUp.destroy();

    this.levelIndex = levelIndex;
    this.matrix = matrix;
    this.handMatrix = handMatrix;
    this.dimensions = [matrix.length, matrix[0].length];

    this.plane = this.createPlane();
    this.blocks = this.createBlocks();
  }

  updateBlocksPosition() {

    /*
    Atualiza a posição de todos os blocos do nível
    */

    this.blocks.forEach(block => {
      block.updatePosition();
    });
  }

  createPlane() {

    /*
    Cria geometria do plano
    */

    // Dimensões para que cubra a base do nível
    let x = (this.dimensions[1]-0.01)*blockSize;
    let y = (this.dimensions[0]-0.01)*blockSize;

    var planeGeometry = new THREE.PlaneGeometry(x, y, 40, 40);

    var planeMaterial = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
      planeMaterial.map = floorTextures[this.levelIndex-1]
      planeMaterial.map.wrapS = THREE.RepeatWrapping;
      planeMaterial.map.wrapT = THREE.RepeatWrapping;
      planeMaterial.map.repeat.set(x/(2*blockSize),y/(2*blockSize))

    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    // Rotacionando o plano para que fique orizontal
    plane.position.set(-blockSize/2, -0.01, -blockSize/2)
    plane.rotateX(THREE.MathUtils.degToRad(-90));
    scene.add(plane);

    return plane;
  }

  createBlocks() {

    /*
    Cria a geometria de todos os blocos do nível
    */

    let blocks = [];
    let centralCannonBlock;

    // Criar os blocos necessários
    for (var i=0; i<this.dimensions[0]; i++) {
      for (var j=0; j<this.dimensions[1]; j++) {

        // Para cada item da matriz que representa um bloco
        if (["U","D","L","R","H","*", "K", "k", "Z", "Y", "W"].includes(this.matrix[i][j])) {

          let block = new Block(this, Level.blockPosition(this, i, j), wallTextures[this.levelIndex-1]);
            block.type = this.matrix[i][j];
            block.hand = (this.handMatrix[i][j] == "X") ? null : this.handMatrix[i][j];
            
          // Se é móvel
          if (["Z", "Y", "W"].includes(this.matrix[i][j])) {
            
            // Modificando textura
            block.object.material.map = wallTextures[3];
              block.movable = true;
              block.speed = blocksSpeed[block.type];
              block.movingDirection = new THREE.Vector3(0,0,1).multiplyScalar(block.type == "Z" || block.type == "W" ? 1 : -1);
          }
          
          // Se for bloco de canhão
          if (block.type == "K" || block.type == "k") {
            
            // Rebaixar sua posição e guardar ref se for central
            block.object.position.y += cannonBlocksOffset;
            if (block.type == "K") 
              centralCannonBlock = block;
          }

          blocks.push(block);
        }  
      }
    }

    // Definindo o bloco central do canhão como pai de todos os blocos de canhão
    if (centralCannonBlock != null) {
      blocks.forEach(block => {
        if (block.type == "k" || block.type == "K") {
          block.parent = centralCannonBlock;
        }
      });
    }
      
    return blocks;
  }

  static blockPosition(level, i, j) {

    /*
    Retorna a posição do bloco de dado índie em coordenadas de mundo
    */

    // Encontrando ponto inicial, para que o nível tenha centro em (0,0,0)
    let x0 = -(level.dimensions[1] * blockSize) / 2;
    let z0 = -(level.dimensions[0] * blockSize) / 2;

    // Gerando posição de dado bloco
    let x = x0 + j * blockSize;
    let z = z0 + i * blockSize;

    return new THREE.Vector3(x, blockSize/2, z);
  }

  static createLampPost(position, rotationAngle) {

    /*
    Cria a geometria de um poste de luz
    */

    let model = lampPostModel.clone();
      model.position.copy(position);
      model.rotateY(rotationAngle/180 * Math.PI);

    let lightPosition = new THREE.Vector3(0,0,0);

    // Mudando materiais e achando posição da lâmpada
    model.traverse(function (child) { 
      if (child.material) {
        child.material = new THREE.MeshLambertMaterial({ color: child.material.color, side: THREE.DoubleSide });
        child.material.castShadow = false;
      }
      
      if (child.name == "Light") {
        child.getWorldPosition(lightPosition);
      }
    });
    
    position.y = blockSize;

    scene.add(model);
    return lightPosition;
  }

  static createSpotlight(lightPosition, targetPosition) {

    /*
    Cria a luz do tipo holofote para um postes de luz, 
    dado um posição da luz, e uma direção
    */

    let spotLight = new THREE.SpotLight("white");
    spotLight.position.copy(lightPosition);
      spotLight.intensity = 8;
      spotLight.angle = THREE.MathUtils.degToRad(35);    
      spotLight.decay = 0.01;         
      spotLight.penumbra = 0.3;       
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 256;
      spotLight.shadow.mapSize.height = 256;
      spotLight.shadow.camera.near = 5;
      spotLight.shadow.camera.far = 30;
      spotLight.shadow.radius = 1.8;

    spotLight.target.position.copy(targetPosition)
    scene.add(spotLight.target)

    scene.add(spotLight);
  }

  static createBasicLights(ambIntensity, dirIntensity) {

    /*
    Cria luzes básicas da cena
    */

    let ambientLight = new THREE.AmbientLight("white", ambIntensity);
    scene.add(ambientLight);

    let dirLight = new THREE.DirectionalLight("white", dirIntensity);
      dirLight.position.copy(new THREE.Vector3(-100,200,-100));
      dirLight.intensity = dirIntensity;
      dirLight.castShadow = true;
      dirLight.shadow.camera.near = 200;
      dirLight.shadow.camera.far = 300;
      dirLight.shadow.camera.left = -100;
      dirLight.shadow.camera.right = 100;
      dirLight.shadow.camera.top = 100;
      dirLight.shadow.camera.bottom = -100;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.radius = 1.8;

    scene.add(dirLight);
  }

  getSpawns() {

    /*
    Retorna índices de cada spawn de tanque definidos na matriz
    */

    let spawns = {};

    // Encontrar marcadores de spawn
    for (var i=0; i<this.dimensions[0]; i++) 
      for (var j=0; j<this.dimensions[1]; j++) 
        if (["P","A","B", "C"].indexOf(this.matrix[i][j]) != -1)
      
          spawns[this.matrix[i][j]] = Level.blockPosition(this, i, j);

    return spawns;
  }

  getTarget() {

    /*
    Retorna índices de cada alvo de spotlight definido na
    matriz de nível
    */

    let target = [];

    // Encontrar marcadores de spawn
    for (var i=0; i<this.dimensions[0]; i++) 
      for (var j=0; j<this.dimensions[1]; j++) 
        if (this.matrix[i][j] == ".") {
          
          target.push([i, j]);
        }

    return target;
  }

  getNest(tankName) {

    /*
    Retorna a posição do ninho de tiro do tanque correspondente
    */

    let nests = [];
   
    // Encontrar marcadores de spawn
    for (var i=0; i<this.dimensions[0]; i++) 
      for (var j=0; j<this.dimensions[1]; j++) 
        if (this.matrix[i][j] == tankName.toLowerCase())
          nests.push(Level.blockPosition(this, i, j));

    if (nests.length == 0)
      return null;
    else
      return nests[Math.floor(Math.random()*2)];
  }

  updateLevelPowerUp(player) {

    /*
    Atualiza o power up e o efeito do power up
    */

    this.powerUp.update(player);
    
    // Quando o tempo de efeito esgotar
    if (!this.powerUp.active && this.powerUp.timer < 0) {

      let freeSpaces = this.validPowerUpPositions();
      let randomIndex  = Math.floor(Math.random() * freeSpaces.length);
      let freeRandomBlock = freeSpaces[randomIndex];
      let freePosition = Level.blockPosition(this, freeRandomBlock[0], freeRandomBlock[1]);

      // Substitui power up
      this.powerUp = new PowerUp((this.powerUp.type+1)%2, freePosition);
    }
  }

  validPowerUpPositions() {
    
    /*
    Encontra todas as posições do level que são válidas 
    para geração de power up 
    */

    let positions = [];

    // Cada elemento da matriz que está vazio é posição válida
    for (let i=0; i<this.matrix.length; i++)
      for (let j=0; j<this.matrix[0].length; j++)
        if (this.matrix[i][j] == " ")
          positions.push([i, j])

    return positions;
  }
}