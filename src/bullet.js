import * as THREE from "../build/three.module.js";

// Importações do projeto
import { bullets, level, scene } from "./main.js"

// Constantes
const projectileRadius = 0.3;
const maxReflections = 2;

export class Bullet {

  constructor(shooter, damageBoosted=false) {

    // Propriedades constantes
    this.author = shooter.name;
    
    // Boost de dano
    this.damageBoosted = damageBoosted;

    // Propriedades gerais
    this.object = this.createGeometry(shooter);
    this.active = true;
    this.direction = (new THREE.Vector3(1, 0, 0)).applyQuaternion(shooter.object.quaternion).normalize();
    this.reflections = 0;
    this.framesSinceReflect = 0;

    // Inicializando colisor que será atualizado por um método
    this.collider = new THREE.Box3();

    // Flag que sinaliza que bala saiu do canhão. Inicializar de acodo com autor
    this.outOfCannon = (this.author == "cannon") ? false : true;
  }

  createGeometry(shooter) {

    let color = this.damageBoosted ? "red" : "orange";

    let material = new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide });

      // Adicionando emissão de luz no tiro
      material.emissive.set(color);
      material.emissiveIntensity = 0.5;

    let projectileGeometry = new THREE.SphereGeometry(projectileRadius);
    let bullet = new THREE.Mesh(projectileGeometry, material);
    bullet.castShadow = true;
    

    // Posição inicial do tiro 
    let shootPosition = new THREE.Vector3();
    shooter.shooter.getWorldPosition(shootPosition);

    // Definindo posição inicial do tiro
    bullet.position.set(shootPosition.x,
                        shootPosition.y,
                        shootPosition.z);

    // Adicionando à cena
    scene.add(bullet);
    return bullet;
  }

  static updatePositions() {

    const speed = 1;

    // Para cada tiro ativo, atualizar posição, considerando a direção e a velocidade
    bullets.forEach(bullet => {
      if (bullet.active)
        bullet.object.position.add(bullet.direction.multiplyScalar(speed));
    })
  }

  static updateColliders() {

    // Para cada projétil atualizar a posição do seu colisor
    bullets.forEach(bullet => {
      bullet.collider.setFromCenterAndSize(bullet.object.position, 
                                           new THREE.Vector3(2*projectileRadius, 
                                                             2*projectileRadius, 
                                                             2*projectileRadius));
    })
  }

  static updateReflections() {

    // Pra cada tiro ativo
    bullets.forEach(bullet => { 
      if (bullet.active) {
          
        // Incrementar contador de frames desde a última reflexão
        bullet.framesSinceReflect++;

        // Pra cada bloco que faz interseção com o tiro
        level.blocks.forEach(block => {
          if (bullet.collider.intersectsBox(block.collider)) {

            // Sinalizar se tiro saiu do canhão
            if (!bullet.outOfCannon && bullet.framesSinceReflect>5)
              bullet.outOfCannon = true;

            // Se for bloco do canhão, destruir tiro
            if (block.type == "c" && bullet.outOfCannon) bullet.selfDestruct()

            // Só refletir dois frames após última reflexão
            else if (bullet.framesSinceReflect>1 && bullet.outOfCannon) {

              // Incrementando contador de reflexões
              bullet.reflections++;
              
              // Se ultrapassou limite de reflexões, destruir
              if (bullet.reflections > maxReflections) bullet.selfDestruct()

              // Do contrário, refletir
              else bullet.reflect(block.dirVec(bullet.object.position));
            }
            
          }
        });
      }
    })
  }

  reflect(blockDirVec) {

    this.direction.reflect(blockDirVec);
    this.framesSinceReflect = 0;

  }

  selfDestruct() {

    this.active = false;
    this.object.visible = false;
    scene.remove(this.object);
  }
}