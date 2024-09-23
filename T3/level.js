import * as THREE from "../build/three.module.js";

// Importações do projeto
import { scene, blockSize, clockDelta } from "./main.js"
import { loadModel } from "./extra_lib.js"
import { Block } from "./block.js"

// Constantes
const lampPostModel = await loadModel("assets/geometries/lamp_post.glb", 2.5);

const blocksSpeed = {

  "W" : 5,
  "Y" : 4,
  "Z" : 3
}

// TEXTURAS
let textureLoader = new THREE.TextureLoader();

const wallTextures = [

  textureLoader.load("assets/textures/crates_of_future/ab_crate_a.png"),
  textureLoader.load("assets/textures/crates_of_future/ab_crate_b.png"),
  textureLoader.load("assets/textures/crates_of_future/ab_crate_d.png")
];

const floorTextures = [

  textureLoader.load("assets/textures/city/Tileable9f.png"),
  textureLoader.load("assets/textures/city/Tileable8d.png"),
  textureLoader.load("assets/textures/city/Tileable10j.png")
];

const cannonBlocksOffset = -3.5;  

// Power Ups
const PowerUpTypes = {

  Heal : 0,
  DamageBoost : 1
}

const powerUpHeight = 2.3;
const powerUpTime = 4;
const powerUpDistance = 4;

class PowerUp {

  constructor(powerUpType, position) {

    this.type = powerUpType;
    this.object = this.createGeometry(position);
    this.active = true;
    this.timer = powerUpTime;
  }

  createGeometry(position) {

    if (this.type == PowerUpTypes.Heal) {

      const geometry = new THREE.CapsuleGeometry(0.5, 1.5, 10, 10); 
      const material = new THREE.MeshLambertMaterial({color: "darkblue"}); 
        material.emissive.set(material.color);
        material.emissiveIntensity = 0.3;
      const obj = new THREE.Mesh(geometry, material); 
      
      // Ajustando rotação
      obj.rotateX(Math.PI/4)
      
      // Ajustando posição
      let parent = new THREE.Mesh()
      position.y = powerUpHeight;
      parent.position.copy(position);

      // Projeção de sombra
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
      
      // Ajustando rotação
      position.y = powerUpHeight;
      obj.position.copy(position);

      // Projeção de sombra
      obj.castShadow = true;
    
      scene.add(obj);
      return obj;
    }
  }

  update(player) {

    // Animar objeto
    this.object.rotateY(clockDelta * 0.8);

    // Atualizar timer se power up estiver desativado
    if (!this.active)
      this.timer -= clockDelta;

    // Se player se aproximar, aplicar efeito e destruir objeto
    if (this.object.position.distanceTo(player.object.position) < powerUpDistance) {

      if (this.active) { 

        this.get(player);
        this.destroy();
      }
    }

    // Atualizar damageBoosted
    if (player.damageBoosted && this.timer < 0)
      player.damageBoosted = false;
  }

  // Pega o power up e inicia seu efeito
  get(player) {
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

    // Informações do nível
    this.levelIndex = levelIndex;
    this.matrix = matrix;
    this.handMatrix = handMatrix;
    this.dimensions = [matrix.length, matrix[0].length];

    // Objetos
    this.plane = this.createPlane();
    this.blocks = this.createBlocks();
  }

  updateBlocksPosition() {

    this.blocks.forEach(block => {

      block.updatePosition();
    });
  }

  createPlane() {

    let x = (this.dimensions[1]-0.01)*blockSize;
    let y = (this.dimensions[0]-0.01)*blockSize;

    // Criando geometria
    var planeGeometry = new THREE.PlaneGeometry(x, y, 40, 40);

    var planeMaterial = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
      planeMaterial.map = floorTextures[this.levelIndex-1]
      planeMaterial.map.wrapS = THREE.RepeatWrapping;
      planeMaterial.map.wrapT = THREE.RepeatWrapping;
      planeMaterial.map.repeat.set(x/(2*blockSize),y/(2*blockSize))

    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    // Tornando o plano horizontal
    plane.position.set(-blockSize/2, -0.01, -blockSize/2)
    plane.rotateX(THREE.MathUtils.degToRad(-90));
    scene.add(plane);

    return plane;
  }

  // Cria todos os blocos do nível
  createBlocks() {

    let blocks = [];
    let centralCannonBlock;

    // Criar os blocos necessários
    for (var i=0; i<this.dimensions[0]; i++) {
      for (var j=0; j<this.dimensions[1]; j++) {

        // Para cada item da matriz que representa um bloco
        if (["U","D","L","R","H","*", "K", "k", "Z", "Y", "W"].indexOf(this.matrix[i][j]) != -1) {

          let block = new Block(this, Level.blockPosition(this, i, j),
                                wallTextures[this.levelIndex-1]);

          block.type = this.matrix[i][j];

          block.hand = (this.handMatrix[i][j] == "X") ? null : this.handMatrix[i][j];
          
          // Se é móvel (se tem valor M ou Y)
          if (this.matrix[i][j] == "Z" || this.matrix[i][j] == "Y" || this.matrix[i][j] == "W") {
            


            block.movable = true;
            block.speed = blocksSpeed[block.type];
            block.movingDirection = new THREE.Vector3(0,0,1).multiplyScalar(block.type == "Z" || block.type == "W" ? 1 : -1);
          }
          
          // Se for bloco de canhão
          if (block.type == "K" || block.type == "k") {
            
            // Rebaixar sua posição
            block.object.position.y += cannonBlocksOffset;
            // Se for bloco central, guardar sua referência
            if (block.type == "K") centralCannonBlock = block;
          }

          blocks.push(block);
        }  
      }
    }

    // Definindo o bloco central do canhão como pai de todod os blocos de canhão
    if (centralCannonBlock != null)
      blocks.forEach(block => {
        if (block.type == "k" || block.type == "K")
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

  static createBasicLights(ambIntensity, dirIntensity) {

    // Luz ambiente
    let ambientLight = new THREE.AmbientLight("white", ambIntensity);
    scene.add(ambientLight);

    // Luz direcional
    let dirLight = new THREE.DirectionalLight("white", dirIntensity);

      // Posição da luz direcional. Por padrão aponta pra origem
      dirLight.position.copy(new THREE.Vector3(-100,200,-100));

      // Configuração de iluminação do spotlight
      dirLight.intensity = dirIntensity;

      // Sombra
      dirLight.castShadow = true;

      // Tronco
      dirLight.shadow.camera.near = 200;
      dirLight.shadow.camera.far = 300;
      dirLight.shadow.camera.left = -100;
      dirLight.shadow.camera.right = 100;
      dirLight.shadow.camera.top = 100;
      dirLight.shadow.camera.bottom = -100;

      // Mapa
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;

      // Ajuste do raio, de forma que a sombra fique suave e definida ao mesmo tempo
      dirLight.shadow.radius = 1.8;

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
        if (["P","A","B", "C"].indexOf(this.matrix[i][j]) != -1)
      
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

  updatePowerUp(player) {

    // Atualiza o power up
    this.powerUp.update(player);
    
    // Se power up desativar, e esgotar o tempo
    if (!this.powerUp.active && this.powerUp.timer < 0) {

      // Listar posições válidas
      let freeSpaces = this.validPowerUpPositions();
      // Sortar uma posição
      let randomIndex  = Math.floor(Math.random() * freeSpaces.length);
      // Achar os índices
      let freeRandomBlock = freeSpaces[randomIndex];
      // Coordenadas
      let freePosition = Level.blockPosition(this, freeRandomBlock[0], freeRandomBlock[1]);

      // Substituir power up por um do próximo tipo
      this.powerUp = new PowerUp((this.powerUp.type+1)%2, freePosition);
    }
  }

  validPowerUpPositions() {

    let positions = [];

    // Para cada elemento da matrix, se não tiver nada registrado,
    // é um espaço válido
    for (let i=0; i<this.matrix.length; i++)
      for (let j=0; j<this.matrix[0].length; j++)
        if (this.matrix[i][j] == " ")
          positions.push([i, j])

    return positions;
  }
}