import * as THREE from "../build/three.module.js";
import { tanks, clockDelta, player, level } from "./main.js";
import { signedAngle, angleBetweenObjects } from "./extra_lib.js"

const distanceCriteria = 4;
const shootAvalabilityCriteria = 1;
const timeCriteria = 5;

export function tankAI(tank) {

  // =========================== AUXILIAR ========================================

  // Direção do tanque 
  let shooterPosition = new THREE.Vector3();
  tank.shooter.getWorldPosition(shooterPosition);
  shooterPosition.y=0;
  let tankDir = tank.object.position.clone().sub(shooterPosition);

  // Encontrando ângulo entre este tanque e o tanque do player
  let angle = angleBetweenObjects(tank.shooter, tank.object, player.object)
  
  // Checando por colisões com blocos
  let collindingBlocks = [];
  level.blocks.forEach(block => {
    if (tank.collider.intersectsBox(block.collider))
      collindingBlocks.push(block);
  });

  // Blocos com colisão, que tem mão definida
  // Listando paredes com mão definida
  let handedCollingBlocks = [];
  collindingBlocks.forEach(block => {
    if (block.hand)
      handedCollingBlocks.push(block);
  });

  // Checando por colisões com tanques
  let collindingTank = null;
  tanks.forEach(tank => {
    if (tank.name != tank.name && tank.collider.intersectsBox(tank.collider))
      collindingTank = tank;
  });

  // =================== CONTROLE DE MODOS =====================================

  // Atualizando timer
  if (tank.AImode == "camp")
    tank.timer -= clockDelta;

  // -------------- MODOS NORMAIS --------------
  
  // Se chegar no nest, passar pro camp
  if (tank.AImode == "nest" && tank.object.position.distanceTo(tank.nest) < distanceCriteria) {
    
    tank.AImode = "camp";
    tank.timer = timeCriteria;
    tank.cumulativeDamage = 0;
  }

  // Se levar 2 danos ou mais, mudar de posição
  else if (tank.AImode == "camp" && tank.cumulativeDamage >= 2) {

    changeNest();

    let onSpawn = tank.object.position.distanceTo(tank.spawnLocation) < distanceCriteria;
    if (onSpawn)
      tank.AImode = "nest"
    else
      tank.AImode = "retreat"
    
    tank.timer = timeCriteria;
    tank.cumulativeDamage = 0;
  }

  else if (tank.AImode == "camp" && tank.timer < 0) {

    changeNest();

    // Ir para um, ou outro para outro nest (mas não ir pro spawn)
    tank.AImode = "nest"
    
    tank.timer = timeCriteria;
    tank.cumulativeDamage = 0;

  }

  // Se recuando já chegou no spawn, ficar de camping 
  else if (tank.AImode == "retreat" && tank.object.position.distanceTo(tank.spawnLocation) < distanceCriteria) {
    tank.AImode = "camp";
    tank.timer = timeCriteria;
    tank.cumulativeDamage = 0;
  }

  // ======================== TIRO ============================================

  // Atualizando contagem de tempo
  tank.timeSinceLastShot += clockDelta;

  // Na cadência adequada, atirar
  if(tank.timeSinceLastShot > shootAvalabilityCriteria) {
      tank.shoot();
      tank.timeSinceLastShot = 0;
  }

  // ===================== FUNÇÕES AUXILIARES =================================

  function goTowards(angle) {
      
    // Rotacionando pro ninho
    if (angle > 0) tank.rotate(true, angle);
    else tank.rotate(false, angle);
    
    tank.move()
  }

  function rotateTowards(angle) {

    // Rotacionando
    if (angle > 0) tank.rotate(true, angle);
    else tank.rotate(false, angle);
  }

  function contourAngle(block) {

    // Direção do bloco
    let blockDir = block.dirVec(tank.object.position);
      
    // Ângulo entre tanque e bloco
    let angle = signedAngle(tankDir, blockDir);

    // Se a fuga da parede é pela direita ou pela esquerda
    let handMultiplier = block.hand == "R" ? 1  : -1;
    
    // Se descendo ou subindo o nível
    let wayMultiplier = (tankDir.x > 0) ? 1 : -1;   

    // Ângulo alvo: quase 90º da parede, raspando levemente
    return angle - (wayMultiplier * handMultiplier * Math.PI/2) - (0.1/180*Math.PI);
  }

  function collindingBlock(collindingBlocks) {

    // COLIDINDO COM PAREDE VÁLIDA
    if (collindingBlocks.length > 0 && collindingBlocks[0].hand) {

      // Escolhendo primeiro bloco
      let collindingBlock = collindingBlocks[0];;

      // Se estiver preso, e houver outro bloco, escolher segundo
      if (!tank.moved && collindingBlocks[1] && collindingBlocks[1].hand)
        collindingBlock = collindingBlocks[1];

      return collindingBlock;
    }

    else {
      return null;
    }
  }

  function changeNest() {

    // Trocar de nest
    let lastNest = tank.nest.clone();
    while (lastNest.x == tank.nest.x)
      tank.nest = level.getNest(tank.name);
  }

  // ======================= EXECUÇÃO DOS MODOS ===============================

  if (tank.AImode == "nest") {

    let block = collindingBlock(collindingBlocks);

    if (block)
      goTowards(contourAngle(block));

    else {
      // Ângulo com o ninho
      let angle = signedAngle(tankDir, tank.object.position.clone().sub(tank.nest));
      goTowards(angle)
    } 
  }  

  else if (tank.AImode == "retreat") {

    let block = collindingBlock(collindingBlocks)
    
    if (block) 
      goTowards(contourAngle(block));
    
    else {
      // Ângulo com o spawn 
      let angle = signedAngle(tankDir, tank.object.position.clone().sub(tank.spawnLocation));
      goTowards(angle);
    }
  }  

  // Em tais modos, ficar parado mirando
  else if (tank.AImode == "camp") {

    rotateTowards(angle);
  }
}