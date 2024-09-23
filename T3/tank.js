import * as THREE from "../build/three.module.js";

// Importações do projeto
import { scene, 
         level, 
         bullets, 
         tanks, 
         clockDelta, 
         player, 
         mobileMode,
         touchControls,
         audio
} from "./main.js"

import { Bullet } from "./bullet.js";
import { Bar } from "./gui.js"
import { loadModel, signedAngle, angleBetweenObjects } from "./extra_lib.js"

// Constantes
const tankModel = await loadModel("assets/geometries/toon_tank.glb", 1.2)
const shooterOffset = 2.3;
const blockSize = 4;
const regularSpeed = 0.3;
const regularRotatingSpeed = 0.08;

const shootAvalabilityCriteria = 1;

const angleCriteria = 45/180*Math.PI;
const nestDistanceCriteria = 3;
const fleeCriteria = 15;
const unjamTime = 0.3;
const hiddenTime = 4; 

const modesDuration = { "follow": 2, "retreat": 3, "camp": 5 }

export class Tank {

  constructor(position, rotationAngle, colors, name, controls) {

    // Propriedades gerais
    this.life = 10;
    this.object = null;
    this.collider = null;
    this.shooter = null;
    this.timeSinceLastShot = Math.random() * shootAvalabilityCriteria;
    this.godMode = false;
    this.damageBoosted = false;
    
    // Propriedades contantes
    this.name = name;
    this.controls = controls;
    this.mainColor = colors["Tank_Root"];

    // Propriedades da IA
    this.AImode = "nest";
    this.standardAImode = "nest";
    this.timer = 0;
    this.lastPosition = new THREE.Vector3(0,0,0);
    this.moved = true;
    this.nest = level.getNest(this.name);
    this.cumulativeDamage = 0;
    this.spawnLocation = level.getSpawns()[this.name]
    this.partner = null;

    // Iniciando com timer aleatório, no range do follow
    this.timer = Math.random() * modesDuration["follow"];

    // Criando barra após definição da cor principal
    this.bar = new Bar(this);

    // Recebendo objeto do tanque e do shooter
    [this.object, this.shooter] = this.createGeometry(position, rotationAngle, colors);
    
    // Inicializando colisor que será atualizado por outro método
    this.collider = new THREE.Box3();
  }

  createGeometry(position, rotationAngle, colors) {

    let model = tankModel.clone();
    position.y = 0;   
    model.position.copy(position);
    model.rotateY(rotationAngle/180 * Math.PI)

    // Para receber objeto de tiro
    let shooter;

    model.traverse(function (child) {
      
      // Se for o cano do tanque, criar objeto de referência
      if (child.name == "Tank_Barrel") {
        shooter = new THREE.Object3D();
        shooter.position.copy(child.position);
        shooter.position.y =+ shooterOffset;
        child.parent.add(shooter);
      }
        
      // Mudando a direção do tanque (canhão virado para +X)
      if (child.parent == model) 
        child.rotateZ(-Math.PI/2);
      
      // Se tem material, definir sua cor de acordo com nome do pai
      if (child.material)
        child.material = new THREE.MeshPhongMaterial({color:colors[child.parent.name]});
    });
    
    scene.add(model); 
    return [model, shooter];
  } 

  rotate(clockwise, angle) {

    let rotatingSpeed;

    // Se for movimento suave, quanto menor for o ângulo, menor será a velocidade de rotação
    if ((angle != null) && (-angleCriteria < angle) && (angle < angleCriteria)) {
      let scalar = Math.abs(angle)/(2*Math.PI);       // Normalizar ângulo e usar como escalar
      rotatingSpeed = scalar * regularRotatingSpeed;
    }

    else {
      rotatingSpeed = regularRotatingSpeed;
    }

    // Direção do movimento
    if (clockwise) { this.object.rotateY(rotatingSpeed); }
    else { this.object.rotateY(-rotatingSpeed); }
  }

  move(ahead=true, slow=false) {

    let speed = slow ? 0.8 * regularSpeed : regularSpeed;

    if (ahead) this.object.translateX( speed);
    else this.object.translateX(-speed);
  }

  updateActions(keyboard) {
    
    let keyboardControls = () => {

      // Rotação
      if (keyboard.pressed(this.controls["left"]))   this.rotate(true);
      if (keyboard.pressed(this.controls["right"]))  this.rotate(false);
      // Translação
      if (keyboard.pressed(this.controls["up"]))     this.move(true);
      if (keyboard.pressed(this.controls["down"]))   this.move(false);
      // Tiro 
      if (keyboard.down(this.controls["shot"]))      this.shoot();

    }

    let touchScreenControls = () => {

      // -------------- Update movements --------------

      let shooterPosition = new THREE.Vector3();
      this.shooter.getWorldPosition(shooterPosition);
      shooterPosition.y=0;
      
      let tankDir = this.object.position.clone().sub(shooterPosition);
      let joystickDir = touchControls.joystickVector;

      // Ângulo com o joystick 
      let angle = signedAngle(tankDir, joystickDir);

      // Rotacionando na direção determinada
      if (joystickDir.length() != 0) {

        // Girar
        if (angle > 0) this.rotate(true, angle*20);
        else this.rotate(false, angle*20);

        // Andar
        this.move();
      }

      // -------------- Update controls --------------
      
      if (touchControls.shootDown)
        this.shoot();

    }

    // Controles do player
    if (this.name == "P") {
      
      if (mobileMode)
        touchScreenControls();
      else
        keyboardControls();
      
    }

    // Controles de IA
    else this.tankAI();

    // Observando se tanquese moveu
    this.moved = this.lastPosition.distanceTo(this.object.position) > 0;
    // Salvando última posição do tanque
    this.lastPosition = this.object.position.clone();
  }

  tankAI() {

    // Encontrando parceiro //////////////// SÓ falta encontrar parceiro e criarmodo help
    if (!this.partner)
      tanks.forEach(tank => {
        if (tank.name != "P" && tank.name != this.name)
          this.partner = tank;
      });

    // =========================== AUXILIAR ========================================
    
    // Incrementando timer
    this.timer += clockDelta;

    // Direção do tanque 
    let shooterPosition = new THREE.Vector3();
    this.shooter.getWorldPosition(shooterPosition);
    shooterPosition.y=0;
    let tankDir = this.object.position.clone().sub(shooterPosition);

    // Encontrando ângulo entre este tanque e o tanque do player
    let angle = angleBetweenObjects(this.shooter, this.object, player.object)
    
    // Checando por colisões com blocos
    let collindingBlocks = [];
    level.blocks.forEach(block => {
      if (this.collider.intersectsBox(block.collider))
        collindingBlocks.push(block);
    });

    // Checando por colisões com tanques
    let collindingTank = null;
    tanks.forEach(tank => {
      if (tank.name != this.name && this.collider.intersectsBox(tank.collider))
        collindingTank = tank;
    });

    // =================== CONTROLE DE MODOS =====================================

    // -------------- MODOS QUE SOBRESCREVEM --------------

    // Se este for A, colidindo com B, entrar em unjam
    if (collindingTank && this.name == "A" && collindingTank.name == "B") {
      this.timer = 0;
      this.AImode = "unjam";
    }

    // Se tanque aproximar muito, flee
    else if (this.object.position.distanceTo(player.object.position) < fleeCriteria) {
      this.cumulativeDamage = 0;
      this.AImode = "flee";
    }

    // Se estiver fugindo mas estiver levendo dano, voltar a atirar
    else if (this.AImode == "flee" && this.cumulativeDamage >= 2) {
      this.cumulativeDamage = 0;
      this.AImode = "despair";
    }
    
    // -------------- SAÍDAS DE SOBRESCRITAS --------------

    // Voltar pro padrão se unjam esgotar
    else if (this.AImode == "unjam" && this.timer > unjamTime) {
      this.AImode = this.standardAImode;
    }
    
    // Sair do despair e levar mais 2 danos, seguir pro retreat 
    else if (this.AImode == "despair" && this.cumulativeDamage >= 2) {
      this.standardAImode = "retreat"
      this.AImode = this.standardAImode;
    }

    // -------------- MODOS NORMAIS --------------
    
    // Se chegar no nest, passar pro camp
    else if (this.AImode == "nest" && this.object.position.distanceTo(this.nest) < nestDistanceCriteria) {
      this.standardAImode = "camp";
      this.cumulativeDamage = 0;
    }

    // Se levar 2 danos ou mais, no camping, recuar
    else if (this.AImode == "camp" && this.cumulativeDamage >= 2) {
      this.standardAImode = "retreat"
    }

    // Se recuando já chegou na base, ficar de camping 
    else if (this.AImode == "retreat" && this.object.position.distanceTo(this.spawnLocation) < nestDistanceCriteria) {
      this.timer = 0;
      this.standardAImode = "hidden";
    }

    else if (this.AImode == "hidden" && this.timer > hiddenTime) {
      this.standardAImode = "nest";
    }
    
    // -------------- SOBRESCRITA --------------
    
    // Se for um dos modos de sobrescrita, ignorar modo padrão
    this.AImode = (["unjam", "flee", "despair"].indexOf(this.AImode) == -1) ? this.standardAImode : this.AImode;

    // ======================== TIRO ==============================================

    // Atualizando contagem de tempo
    this.timeSinceLastShot += clockDelta;

    // Na cadência adequada, atirar
    if(this.timeSinceLastShot > shootAvalabilityCriteria) {
        this.shoot();
        this.timeSinceLastShot = 0;
    }

    // ======================= EXECUÇÃO DOS MODOS ================================

    if (this.AImode == "nest") {

      // Ângulo com o ninho 
      let angle = signedAngle(tankDir, this.object.position.clone().sub(this.nest));

      // Rotacionando pro ninho
      if (angle > 0) this.rotate(true, angle);
      else this.rotate(false, angle);

      this.move()
    }  

    else if (this.AImode == "retreat") {

      // COLIDINDO COM PAREDE VÁLIDA
      if (collindingBlocks.length > 0 && collindingBlocks[0].hand) {

        // Se estiver movendo, usar primeiro bloco
        // Se não, escolher aleatoriamente, até começar a mover
        let collindingBlock;
        if (this.moved)
          collindingBlock = collindingBlocks[0];
        else 
        collindingBlock = collindingBlocks[1];

        // Direção do bloco
        let blockDir = collindingBlock.dirVec(this.object.position);
        
        // Ângulo entre tanque e bloco
        let angle = signedAngle(tankDir, blockDir);

        // Se a fuga da parede é pela direita ou pela esquerda
        let handMultiplier = collindingBlock.hand == "R" ? 1  : -1;
        
        // Se descendo ou subindo o nível
        let wayMultiplier = (tankDir.x > 0) ? 1 : -1;   

        // Ângulo alvo: quase 90º da parede, raspando levemente
        let targetAngle = angle - (wayMultiplier * handMultiplier * Math.PI/2) - (0.1/180*Math.PI);

        // Ângulo é exagerado para que o smooth da rotação seja menor
        if (targetAngle > 0) this.rotate(true, targetAngle);
        else this.rotate(false, targetAngle);
        this.move(true, true);

      }

      else {
 
        // Ângulo com o ninho 
        let angle = signedAngle(tankDir, this.object.position.clone().sub(this.spawnLocation));
        
        // Rotacionando pro ninho
        if (angle > 0) this.rotate(true, angle);
        else this.rotate(false, angle);
        
        this.move()
      }
    }  

    // Em tais modos, ficar mirando
    else if (this.AImode == "camp" || this.AImode == "despair" || this.AImode == "hidden") {

      if (angle > 0) this.rotate(true, angle);
      else this.rotate(false, angle);
    }

    else if (this.AImode == "unjam") {

      // Rotacionando
      if (angle > 0) this.rotate(true, angle);
      else this.rotate(false, angle);

      // Dando ré, rápido
      this.move(false, false)
    }

    else if (this.AImode == "flee"  || this.AImode == "help") {

      // COLIDINDO COM PAREDE VÁLIDA
      if (collindingBlocks.length > 0 && collindingBlocks[0].hand) {

        // Se estiver movendo, usar primeiro bloco
        // Se não, escolher aleatoriamente, até começar a mover
        let collindingBlock;
        if (this.moved)
          collindingBlock = collindingBlocks[0];
        else 
        collindingBlock = collindingBlocks[1];

        // Direção do bloco
        let blockDir = collindingBlock.dirVec(this.object.position);
        
        // Ângulo entre tanque e bloco
        let angle = signedAngle(tankDir, blockDir);

        // Se a fuga da parede é pela direita ou pela esquerda
        let handMultiplier = collindingBlock.hand == "R" ? 1  : -1;
        
        // Se descendo ou subindo o nível
        let wayMultiplier = (tankDir.x > 0) ? 1 : -1;   

        // Ângulo alvo: quase 90º da parede, raspando levemente
        let targetAngle = angle - (wayMultiplier * handMultiplier * Math.PI/2) - (0.1/180*Math.PI);

        // Ângulo é exagerado para que o smooth da rotação seja menor
        if (targetAngle > 0) this.rotate(true, targetAngle);
        else this.rotate(false, targetAngle);
        this.move(true, true);

      }

      // NÃO COLIDINDO
      else {

        angle = -angle

        // Rotacionando
        if (angle > 0) this.rotate(true, angle);
        else this.rotate(false, angle);

        // Seguir em frente
        this.move(true, true)
      }
    }
  }

  shoot() {

    bullets.push(new Bullet(this, this.damageBoosted));
    audio.playSound("shot", 0.2);
  }

  updateCollider() {

    // Colisor à meia altura do bloco
    let colliderCenter = this.object.position.clone()
      .add(new THREE.Vector3(0,blockSize/2,0));

    this.collider.setFromCenterAndSize(colliderCenter, 
                                       new THREE.Vector3(blockSize, 
                                                         blockSize, 
                                                         blockSize));
  }

  updateEmission() {

    // Quando estiver no god mode, ativar emissão
    if (this.godMode){

      this.object.traverse( function(child) {
        if (child.material) {

          child.material.emissive.set("lightgreen");
          child.material.emissiveIntensity = 1;
        }
      });

    } else {
      
      this.object.traverse( function(child) {
        if (child.material) {

          child.material.emissive.set("lightgreen");
          child.material.emissiveIntensity = 0;
        }
      });
    }
  }

  updateLife() {

    // Atualiza emissão do god mode
    this.updateEmission()

    // Pra cada projétil
    bullets.forEach(bullet => {

      let pos1 = new THREE.Vector3();
      let pos2 = new THREE.Vector3();

      this.collider.getCenter(pos1)
      bullet.collider.getCenter(pos2)

      let authorCondition;
      
      // Se for o player, só não toma dano de si
      if (this.name == "P") authorCondition = (bullet.author != "P");
      else authorCondition = (bullet.author != "A" && bullet.author != "B");

      // Se estiver ativo, não for de própria autoria, e tiver intersectando
      if ((bullet.active) && (authorCondition) && (bullet.collider.intersectsBox(this.collider))) {
        
        // Decrementar vida se fora do god mode, de acordo estado do boost de dano
        if (!this.godMode) this.life -= bullet.damageBoosted ? 2 : 1;
        audio.playSound("bonk", (this.name == "P") ? 0.3 : 0.1);
        // Atualziar contador de dano
        this.cumulativeDamage++;
        // Desativar tiro
        bullet.active = false;
        bullet.object.visible = false;
        scene.remove(bullet.object);
      }
    })
  } 

  updateCollisions() {
    
    // Para cada bloco com o qual houve interseção
    level.blocks.forEach(block => {
      if (this.collider.intersectsBox(block.collider)) {

        let dir = block.dir(this.object.position);

        if ((dir == "L") && (this.object.position.x - block.object.position.x < blockSize/2))
          this.object.position.x = block.object.position.x - blockSize;

        if ((dir == "R") && (this.object.position.x - block.object.position.x > blockSize/2))
          this.object.position.x = block.object.position.x + blockSize;

        if ((dir == "U") && (this.object.position.z - block.object.position.z < blockSize/2))
          this.object.position.z = block.object.position.z - blockSize;

        if ((dir == "D") && (this.object.position.z - block.object.position.z > blockSize/2)) 
            this.object.position.z = block.object.position.z + blockSize;
      }
    });
  }

  selfDestruct() {

    tanks.splice(tanks.indexOf(this), 1);
    scene.remove(this.bar.background);
    scene.remove(this.object);
  }
}

