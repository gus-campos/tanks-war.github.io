import * as THREE from "../build/three.module.js";
import { tanks, clockDelta, player, level } from "./main.js";
import { signedAngle, angleBetweenObjects } from "./extra_lib.js"

const nestDistanceCriteria = 3;
const fleeCriteria = 15;
const unjamTime = 0.3;
const hiddenTime = 4; 
const shootAvalabilityCriteria = 1;

export function tankAI(obj) {

  // Encontrando parceiro //////////////// SÓ falta encontrar parceiro e criarmodo help
  if (!obj.partner)
    tanks.forEach(tank => {
      if (tank.name != "P" && tank.name != obj.name)
        obj.partner = tank;
    });

  // =========================== AUXILIAR ========================================
  
  // Incrementando timer
  obj.timer += clockDelta;

  // Direção do tanque 
  let shooterPosition = new THREE.Vector3();
  obj.shooter.getWorldPosition(shooterPosition);
  shooterPosition.y=0;
  let tankDir = obj.object.position.clone().sub(shooterPosition);

  // Encontrando ângulo entre este tanque e o tanque do player
  let angle = angleBetweenObjects(obj.shooter, obj.object, player.object)
  
  // Checando por colisões com blocos
  let collindingBlocks = [];
  level.blocks.forEach(block => {
    if (obj.collider.intersectsBox(block.collider))
      collindingBlocks.push(block);
  });

  // Checando por colisões com tanques
  let collindingTank = null;
  tanks.forEach(tank => {
    if (tank.name != obj.name && obj.collider.intersectsBox(tank.collider))
      collindingTank = tank;
  });

  // =================== CONTROLE DE MODOS =====================================

  // -------------- MODOS QUE SOBRESCREVEM --------------

  // Se este for A, colidindo com B, entrar em unjam
  if (collindingTank && obj.name == "A" && collindingTank.name == "B") {
    obj.timer = 0;
    obj.AImode = "unjam";
  }

  // Se tanque aproximar muito, flee
  else if (obj.object.position.distanceTo(player.object.position) < fleeCriteria) {
    obj.cumulativeDamage = 0;
    obj.AImode = "flee";
  }

  // Se estiver fugindo mas estiver levendo dano, voltar a atirar
  else if (obj.AImode == "flee" && obj.cumulativeDamage >= 2) {
    obj.cumulativeDamage = 0;
    obj.AImode = "despair";
  }
  
  // -------------- SAÍDAS DE SOBRESCRITAS --------------

  // Voltar pro padrão se unjam esgotar
  else if (obj.AImode == "unjam" && obj.timer > unjamTime) {
    obj.AImode = obj.standardAImode;
  }
  
  // Sair do despair e levar mais 2 danos, seguir pro retreat 
  else if (obj.AImode == "despair" && obj.cumulativeDamage >= 2) {
    obj.standardAImode = "retreat"
    obj.AImode = obj.standardAImode;
  }

  // -------------- MODOS NORMAIS --------------
  
  // Se chegar no nest, passar pro camp
  else if (obj.AImode == "nest" && obj.object.position.distanceTo(obj.nest) < nestDistanceCriteria) {
    obj.standardAImode = "camp";
    obj.cumulativeDamage = 0;
  }

  // Se levar 2 danos ou mais, no camping, recuar
  else if (obj.AImode == "camp" && obj.cumulativeDamage >= 2) {
    obj.standardAImode = "retreat"
  }

  // Se recuando já chegou na base, ficar de camping 
  else if (obj.AImode == "retreat" && obj.object.position.distanceTo(obj.spawnLocation) < nestDistanceCriteria) {
    obj.timer = 0;
    obj.standardAImode = "hidden";
  }

  else if (obj.AImode == "hidden" && obj.timer > hiddenTime) {
    obj.standardAImode = "nest";
  }
  
  // -------------- SOBRESCRITA --------------
  
  // Se for um dos modos de sobrescrita, ignorar modo padrão
  obj.AImode = (["unjam", "flee", "despair"].indexOf(obj.AImode) == -1) ? obj.standardAImode : obj.AImode;

  // ======================== TIRO ==============================================

  // Atualizando contagem de tempo
  obj.timeSinceLastShot += clockDelta;

  // Na cadência adequada, atirar
  if(obj.timeSinceLastShot > shootAvalabilityCriteria) {
      obj.shoot();
      obj.timeSinceLastShot = 0;
  }

  // ======================= EXECUÇÃO DOS MODOS ================================

  if (obj.AImode == "nest") {

    // Ângulo com o ninho 
    let angle = signedAngle(tankDir, obj.object.position.clone().sub(obj.nest));

    // Rotacionando pro ninho
    if (angle > 0) obj.rotate(true, angle);
    else obj.rotate(false, angle);

    obj.move()
  }  

  else if (obj.AImode == "retreat") {

    // COLIDINDO COM PAREDE VÁLIDA
    if (collindingBlocks.length > 0 && collindingBlocks[0].hand) {

      // Se estiver movendo, usar primeiro bloco
      // Se não, escolher aleatoriamente, até começar a mover
      let collindingBlock;
      if (obj.moved)
        collindingBlock = collindingBlocks[0];
      else 
      collindingBlock = collindingBlocks[1];

      // Direção do bloco
      let blockDir = collindingBlock.dirVec(obj.object.position);
      
      // Ângulo entre tanque e bloco
      let angle = signedAngle(tankDir, blockDir);

      // Se a fuga da parede é pela direita ou pela esquerda
      let handMultiplier = collindingBlock.hand == "R" ? 1  : -1;
      
      // Se descendo ou subindo o nível
      let wayMultiplier = (tankDir.x > 0) ? 1 : -1;   

      // Ângulo alvo: quase 90º da parede, raspando levemente
      let targetAngle = angle - (wayMultiplier * handMultiplier * Math.PI/2) - (0.1/180*Math.PI);

      // Ângulo é exagerado para que o smooth da rotação seja menor
      if (targetAngle > 0) obj.rotate(true, targetAngle);
      else obj.rotate(false, targetAngle);
      obj.move(true, true);

    }

    else {

      // Ângulo com o ninho 
      let angle = signedAngle(tankDir, obj.object.position.clone().sub(obj.spawnLocation));
      
      // Rotacionando pro ninho
      if (angle > 0) obj.rotate(true, angle);
      else obj.rotate(false, angle);
      
      obj.move()
    }
  }  

  // Em tais modos, ficar mirando
  else if (obj.AImode == "camp" || obj.AImode == "despair" || obj.AImode == "hidden") {

    if (angle > 0) obj.rotate(true, angle);
    else obj.rotate(false, angle);
  }

  else if (obj.AImode == "unjam") {

    // Rotacionando
    if (angle > 0) obj.rotate(true, angle);
    else obj.rotate(false, angle);

    // Dando ré, rápido
    obj.move(false, false)
  }

  else if (obj.AImode == "flee"  || obj.AImode == "help") {

    // COLIDINDO COM PAREDE VÁLIDA
    if (collindingBlocks.length > 0 && collindingBlocks[0].hand) {

      // Se estiver movendo, usar primeiro bloco
      // Se não, escolher aleatoriamente, até começar a mover
      let collindingBlock;

      collindingBlock = collindingBlocks[0];
      
      if (!obj.moved && collindingBlocks[1] && collindingBlocks[1].hand)
        collindingBlock = collindingBlocks[1];

      // Direção do bloco
      let blockDir = collindingBlock.dirVec(obj.object.position);
      
      // Ângulo entre tanque e bloco
      let angle = signedAngle(tankDir, blockDir);

      // Se a fuga da parede é pela direita ou pela esquerda
      let handMultiplier = collindingBlock.hand == "R" ? 1  : -1;
      
      // Se descendo ou subindo o nível
      let wayMultiplier = (tankDir.x > 0) ? 1 : -1;   

      // Ângulo alvo: quase 90º da parede, raspando levemente
      let targetAngle = angle - (wayMultiplier * handMultiplier * Math.PI/2) - (0.1/180*Math.PI);

      // Ângulo é exagerado para que o smooth da rotação seja menor
      if (targetAngle > 0) obj.rotate(true, targetAngle);
      else obj.rotate(false, targetAngle);
      obj.move(true, true);

    }

    // NÃO COLIDINDO
    else {

      angle = -angle

      // Rotacionando
      if (angle > 0) obj.rotate(true, angle);
      else obj.rotate(false, angle);

      // Seguir em frente
      obj.move(true, true)
    }
  }
}