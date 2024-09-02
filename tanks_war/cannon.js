import * as THREE from 'three';
import { CSG } from 'CSGMesh';

// Importações do projeto
import { scene, bullets, tanks, clockDelta } from './main.js'
import { Bullet } from './bullet.js'
import { angleBetweenObjects } from "./extra_lib.js"

// Constantes
const cannonBlocksOffset = 1;
const cannonHeightOffset = 0.5;
const cannonWidthOffset = -0.4;
const cannonScale = 0.4;
const angleCriteria = 5/180 * Math.PI;
const shootAvalabilityCriteria = 3;
const regularRotatingSpeed = 0.01;
const shooterOffset = 6;

export class Cannon {

  constructor(position) {

    this.name = "cannon";
    this.object;
    this.timeSinceLastShot = Math.random() * shootAvalabilityCriteria;
    [this.object, this.shooter] = this.createGeometry(position);
    
  }

  createGeometry(position) {

    // Material
    let material = new THREE.MeshPhongMaterial();
      
    material.color.set("rgb(105,105,105)");
    material.side = THREE.DoubleSide;
    material.specular.set("gray");
    material.castShadow = true;

    // ========================== Holder ==================================

    // ----------------------- Seção de torus ----------------------------- 
    let geometry = new THREE.TorusGeometry(4, 3);
    let holderTorus = new THREE.Mesh(geometry, material);
    holderTorus.position.set(0, 0, 0);

    geometry = new THREE.BoxGeometry(15, 8, 8);
    let holderBox = new THREE.Mesh(geometry, material);
    holderBox.position.set(0, -4-1, 0);

    // Atualizando matrizes
    holderTorus.updateMatrix();
    holderBox.updateMatrix();
    
    //Create a bsp tree from each of the meshes
    let a = CSG.fromMesh(holderTorus);         
    let b = CSG.fromMesh(holderBox);
    
    // Operação de interseção
    let result = a.intersect(b);
    
    // Seção de torus
    let torusSection = CSG.toMesh(result, holderTorus.matrix, holderTorus.material);
    torusSection.position.set(0,0,0);
    
    // ----------------- Preenchimento do Torus ---------------------------

    geometry = new THREE.CylinderGeometry(4, 4, 6);
    let fillingCylinder= new THREE.Mesh(geometry, material);
    fillingCylinder.rotateX(90/180*Math.PI);
    
    geometry = new THREE.BoxGeometry(14, 6, 6);
    let fillingCuttingBox = new THREE.Mesh(geometry, material);
    fillingCuttingBox.position.set(0, 2, 0);

    // Atualizando matrizes
    fillingCylinder.updateMatrix();
    fillingCuttingBox.updateMatrix();
    
    // Create a bsp tree from each of the meshes
    a = CSG.fromMesh(fillingCylinder);
    b = CSG.fromMesh(fillingCuttingBox);
    
    // Operação de subtração
    result = a.subtract(b);
    
    // Resultado
    let filling = CSG.toMesh(result, fillingCylinder.matrix, fillingCylinder.material);

    // ------------------------- Holder -----------------------------------

    ////Make sure the .matrix of each mesh is current
    torusSection.updateMatrix();
    filling.updateMatrix();

    // Create a bsp tree from each of the meshes
    a = CSG.fromMesh(torusSection);
    b = CSG.fromMesh(filling);

    // Operação de união entre as partes
    result = a.union(b);
    
    // Resultado
    let holder = CSG.toMesh(result, torusSection.matrix, torusSection.material);
    holder.position.set(-1,0,0);
    
    // ========================== Base ====================================

    // --------------------- Base A ---------------------------------------
    geometry = new THREE.CylinderGeometry(8.5, 9, 1);
    let baseA = new THREE.Mesh(geometry, material);
    baseA.position.set(0,-7,0);
    
    // ------------------ Base B ------------------------------------------
    geometry = new THREE.CylinderGeometry(6, 6.5, 1);
    let baseB = new THREE.Mesh(geometry, material);
    baseB.position.set(-1,-6,0);

    // --------------------- Base -----------------------------------------

    // Make sure the .matrix of each mesh is current
    baseA.updateMatrix();
    baseB.updateMatrix();

    // Create a bsp tree from each of the meshes
    a = CSG.fromMesh(baseA);
    b = CSG.fromMesh(baseB);

    // Operação de união
    result = a.union(b);

    // Resultado
    let base = CSG.toMesh(result, torusSection.matrix, torusSection.material);

    // ============================ Cano ==================================

    // ------------------ Cilindro principal  -----------------------------
    geometry = new THREE.CylinderGeometry(3, 3, 24);
    let barrelMain = new THREE.Mesh(geometry, material);
    barrelMain.rotateZ(90/180*Math.PI);
    barrelMain.position.set(2.5,-1,0);

    // ------------------------ Detalhes ----------------------------------

    // Detalhe A
    geometry = new THREE.CylinderGeometry(3.5, 3.5, 7);
    let detailA = new THREE.Mesh(geometry, material);
    detailA.rotateZ(90/180*Math.PI);
    detailA.position.set(10,-1,0);

    // Detalhe B
    geometry = new THREE.CylinderGeometry(3.5, 3.5, 8);
    let detailB = new THREE.Mesh(geometry, material);
    detailB.rotateZ(90/180*Math.PI);
    detailB.position.set(-4.5,-1,0);

    ////Make sure the .matrix of each mesh is current
    barrelMain.updateMatrix();
    detailA.updateMatrix();
    detailB.updateMatrix();

    // Create a bsp tree from each of the meshes
    a = CSG.fromMesh(detailA);
    b = CSG.fromMesh(detailB);
    let c = CSG.fromMesh(barrelMain);

    // Duas operações de união sucessivas
    result = c.union(a.union(b));

    let barrel = CSG.toMesh(result, torusSection.matrix, torusSection.material);

    // ===================== CANHÃO COMPLETO ==============================  
    
    // Make sure the .matrix of each mesh is current
    holder.updateMatrix();
    base.updateMatrix();
    barrel.updateMatrix();
    
    // Create a bsp tree from each of the meshes
    a = CSG.fromMesh(holder);
    b = CSG.fromMesh(base);
    c = CSG.fromMesh(barrel);
    
    // Duas operações de união sucessivas
    result = c.union(a.union(b));

    let cannonMesh = CSG.toMesh(result, holder.matrix, holder.material);
    cannonMesh.position.set(0,0,0);
    
    // Coincidindo o centro da base do canão com o zero do objeto pai
    let cannon = new THREE.Object3D();
    cannon.add(cannonMesh);
    
    // Trazendo centro pro (0,0,0)
    cannonMesh.scale.set(cannonScale, cannonScale, cannonScale);
    cannonMesh.position.y += cannonHeightOffset;
    cannonMesh.position.x += cannonWidthOffset;
    
    // Posicionando sobre o bloco
    cannon.position.copy(position);
    cannon.position.y += cannonBlocksOffset;

    // Adicionando objeto atirador
    let shooter = new THREE.Object3D();
    shooter.position.x += shooterOffset;
    cannon.add(shooter);

    // Iniciar virado para "baixo"
    cannon.rotation.y = -Math.PI/2
    
    // Adicionando canhão à cena
    scene.add(cannon); 
    return [cannon, shooter];
  }

  shoot() {

    bullets.push(new Bullet(this));
    this.shotAvailable = false;
  }

  rotate(clockwise, smooth, angle) {

    let rotatingSpeed;
  
    // Se for movimento suave, quanto menor for o ângulo, menor será a velocidade de rotação
    if (smooth) {
      let scalar = Math.abs(angle)/(2*Math.PI);     // Normalizar ângulo e usar como escalar
      rotatingSpeed = scalar * regularRotatingSpeed;
    }
  
    else {
      rotatingSpeed = regularRotatingSpeed;
    }
  
    // Direção do movimento
    if (clockwise) this.object.rotateY(rotatingSpeed)
    else this.object.rotateY(-rotatingSpeed)
    }


  update() {

    // Encontrando o tanque mais próximo
    let closestTank = tanks[0];
    let closestDistance = tanks[0].object.position.distanceTo(this.object.position)

    
    for(let i=1; i<tanks.length; i++) {
      
      let thisTank = tanks[i]
      let thisDistance = tanks[i].object.position.distanceTo(this.object.position);

      if (thisDistance < closestDistance) {

        closestTank = thisTank;
        closestDistance = thisDistance;
      }
    }

    // Vetores posição
    let shooterPosition = new THREE.Vector3();
    this.shooter.getWorldPosition(shooterPosition);
    
    // Ângulo entre canhão e tanque alvo
    let angle = angleBetweenObjects(this.shooter, this.object, closestTank.object)

    // Movimento smooth se tiver perto o suficiente
    let smooth = (-angleCriteria < angle && angle < angleCriteria)

    if (angle > 0) this.rotate(true, smooth, angle);
    else this.rotate(false, smooth, angle);

    // Atualizando contagem de tempo
    this.timeSinceLastShot += clockDelta;

    // Na cadência adequada, atirar
    if(this.timeSinceLastShot > shootAvalabilityCriteria) {
      this.shoot();
      this.timeSinceLastShot = 0;
    }
  }
}