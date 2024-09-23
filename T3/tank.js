import * as THREE from "../build/three.module.js";

// Importações do projeto
import { scene, 
         level, 
         bullets, 
         tanks, 
         mobileMode,
         touchControls,
         audio,
         clockDelta
} from "./main.js"

import { tankAI } from './tank_ai.js'

import { Bullet } from "./bullet.js";
import { Bar } from "./gui.js"
import { loadModel, signedAngle } from "./extra_lib.js"

// Constantes
const tankModel = await loadModel("assets/geometries/toon_tank.glb", 1.2)
const shooterOffset = 2.3;
const blockSize = 4;
const regularSpeed = 0.3;
const regularRotatingSpeed = 0.08;
const shootAvalabilityCriteria = 1;
const angleCriteria = 45/180*Math.PI;

const timeCriteria = 5;

export class Tank {

  constructor(position, rotationAngle, colors, name) {

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
    this.mainColor = colors["Tank_Root"];

    // Propriedades da IA
    this.AImode = "nest";
    this.timer = 0;
    this.lastPosition = new THREE.Vector3(0,0,0);
    this.lastPosition2 = new THREE.Vector3(0,0,0);
    this.moved = true;
    this.nest = level.getNest(this.name);
    this.cumulativeDamage = 0;
    this.spawnLocation = level.getSpawns()[this.name]
    this.partner = null;

    // Iniciando com timer aleatório, no range do follow
    this.timer = timeCriteria;

    // Criando barra após definição da cor principal
    this.bar = new Bar(this);

    // Recebendo objeto do tanque e do shooter
    [this.object, this.shooter] = this.createGeometry(position, rotationAngle, colors);
    
    // Inicializando colisor que será atualizado por outro método
    this.collider = new THREE.Box3();
  }

  tankAI() {

    tankAI(this);
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
      // Translação
      if ((keyboard.pressed("A") || keyboard.pressed("left")))  this.rotate(true);
      if ((keyboard.pressed("D") || keyboard.pressed("right"))) this.rotate(false);
      if ((keyboard.pressed("W") || keyboard.pressed("up")))    this.move(true);
      if ((keyboard.pressed("S") || keyboard.pressed("down")))  this.move(false);
      // Tiro 
      if (keyboard.down("space"))   this.shoot();

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
      else authorCondition = (bullet.author != "A" && bullet.author != "B" && bullet.author != "C");

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

    // Atualizando última posição
    this.lastPosition2 = this.object.position.clone();
  } 

  updateCollisions() {
    
    // Para cada bloco com o qual houve interseção
    level.blocks.forEach(block => {
      
      if (this.collider.intersectsBox(block.collider)) {

        // Se for bloco móvel
        if (this.name == "P" && block.movable) {

          // Se for direções horizontais, e tiver de frente pro bloco
          let dir = block.dir(this.object.position)
          if (dir == "L" || dir == "R") {

            // Se tiver de frente pro bloco
            let tankZ = this.object.position.z;
            let blockZ = block.object.position.z;
            if (tankZ < (blockZ + blockSize/2) && tankZ > (blockZ - blockSize/2)) {

              // Se não estiver no meio do bloco (preso ou lateral)
              let tankX = this.object.position.x;
              let blockX = block.object.position.x;
              if (Math.abs(tankX - blockX) > blockSize/2) {

                // Congelando posições
                this.object.position.copy(this.lastPosition2);
                // Exceto na direção z, que acompanhará o z do bloco
                this.object.position.z +=  block.speed * block.movingDirection.z * clockDelta;
              }
            }
          }
        }

        let dir = block.dir(this.object.position);
        
        // ====================== Limitando movimento em direção ao bloco ======================
        if ((dir == "L") && (this.object.position.x - block.object.position.x < blockSize/2))
          this.object.position.x = block.object.position.x - blockSize - 0.01;

        if ((dir == "R") && (this.object.position.x - block.object.position.x > blockSize/2))
          this.object.position.x = block.object.position.x + blockSize + 0.01;

        if ((dir == "U") && (this.object.position.z - block.object.position.z < blockSize/2))
          this.object.position.z = block.object.position.z - blockSize - 0.01;

        if ((dir == "D") && (this.object.position.z - block.object.position.z > blockSize/2)) 
            this.object.position.z = block.object.position.z + blockSize + 0.01;

      }
    });
  }

  selfDestruct() {

    tanks.splice(tanks.indexOf(this), 1);
    scene.remove(this.bar.background);
    scene.remove(this.object);
  }
}

