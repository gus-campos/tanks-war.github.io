import * as THREE from "../build/three.module.js";

// Importações do projeto
import { bullets, level, scene } from "./main.js"

// Constantes
const projectileRadius = 0.3;
const maxReflections = 2;
const bulletSpeed = 1;

export class Bullet {

  constructor(shooter, damageBoosted=false) {

    this.author = shooter.name;

    this.damageBoosted = damageBoosted;

    this.object = this.createGeometry(shooter);
    this.active = true;
    this.direction = (new THREE.Vector3(1, 0, 0)).applyQuaternion(shooter.object.quaternion).normalize();
    this.reflections = 0;
    this.framesSinceReflect = 0;

    this.collider = new THREE.Box3();
    this.outOfCannon = (this.author == "cannon") ? false : true;
  }

  createGeometry(shooter) {

    /*
    Cria geometria do tiro
    */

    let color = this.damageBoosted ? "red" : "orange";

    let material = new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide });
      material.emissive.set(color);
      material.emissiveIntensity = 0.5;

    let projectileGeometry = new THREE.SphereGeometry(projectileRadius);
    let bullet = new THREE.Mesh(projectileGeometry, material);
    bullet.castShadow = true;
    
    // Posição inicial
    let shootPosition = new THREE.Vector3();
    shooter.shooter.getWorldPosition(shootPosition);
    bullet.position.set(shootPosition.x,
                        shootPosition.y,
                        shootPosition.z);

    scene.add(bullet);
    return bullet;
  }

  static updatePositions() {

    /*
    Atualiza a posição do tiro, de acordo com sua velocidade e passagem do tempo
    */

    bullets.forEach(bullet => {
      if (bullet.active) {
        bullet.object.position.add(bullet.direction.multiplyScalar(bulletSpeed));
      }
    })
  }

  static updateColliders() {

    /*
    Atualiza a posição do colisor de cada tiro
    */

    bullets.forEach(bullet => {
      bullet.collider.setFromCenterAndSize(
        
          bullet.object.position,
          new THREE.Vector3(projectileRadius, 
                            projectileRadius, 
                            projectileRadius).multiplyScalar(2)
        );
    })
  }

  static updateReflections() {

    /*
    Atualiza a direção do tiro, de acordo com as colisões que faz
    */

    bullets.forEach(bullet => { 
      if (bullet.active) {
          
        bullet.framesSinceReflect++;

        // Pra cada bloco qu está sendo colidido
        level.blocks.forEach(block => {
          if (bullet.collider.intersectsBox(block.collider)) {

            if (!bullet.outOfCannon && bullet.framesSinceReflect>5) {
              bullet.outOfCannon = true;
            }

            if (block.type == "c" && bullet.outOfCannon) {
              bullet.selfDestruct()
            }

            else if (bullet.framesSinceReflect>1 && bullet.outOfCannon) {

              bullet.reflections++;

              if (bullet.reflections > maxReflections) {
                bullet.selfDestruct()
              } 
                
              else {
                bullet.reflect(block.dirVec(bullet.object.position));
              } 
            }
          }
        });
      }
    })
  }

  reflect(blockDirVec) {

    /*
    Muda direção do tiro e o atualiza de acordo
    */

    this.direction.reflect(blockDirVec);
    this.framesSinceReflect = 0;

  }

  selfDestruct() {

    /*
    Destrói o objeto e o remove da cena
    */

    this.active = false;
    this.object.visible = false;
    scene.remove(this.object);
  }
}