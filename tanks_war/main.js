import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import KeyboardState from 'KeyboardState';
import { initCamera, onWindowResize } from 'util';

// Importações do projeto
import { Level } from "./level.js";
import { Tank } from "./tank.js";
import { Bullet } from "./bullet.js";
import { Cannon } from "./cannon.js";

// Importação de dados do jogo
import { levelMatrixes, 
  handMatrixes, 
  wallColors, 
  floorColors,
  lightsIntensities,
  colors, 
  controls, 
  initialRotationAngles 
} from './game_data.js';

// Constantes
const minDist = 30;
const aproxScale = 1.5;
const cameraAxe = new THREE.Vector3(0, 1, 1)
export const blockSize = 4;

// ============================================================================

function updateCamera() {
  
  // Inicializando
  let lookAt = new THREE.Vector3(0,0,0);
  let dist = 0;

  // Encontrando centro de massa dos tanques
  tanks.forEach(tank => {
    
    lookAt = lookAt.clone().add(tank.object.position);
  });
  lookAt = lookAt.multiplyScalar(1/tanks.length);

  // Encontranda distância média da câmera até o lookAt
  tanks.forEach(tank => {
    
    dist += lookAt.clone().distanceTo(tank.object.position);
  });
  dist /= tanks.length;
  
  // Aproximar e afastar proporcinalmente de acordo com o redimensionamento da tela
  // Considerando uma resolução ideal de 1920x1080
  let widthDistScaler = 1920/window.innerWidth;
  let heightDistScaler = 1*window.innerHeight/1080;

  // Escala total de distância
  let totalDistScale = minDist+aproxScale*widthDistScaler*heightDistScaler*dist;
  
  // Definir que câmera olhará pro centro de massa dos tanques
  camera.lookAt(lookAt)
  // Definir distância da câmera de acordo com o escala total de distância calculada
  camera.position.copy(cameraAxe.clone().multiplyScalar(totalDistScale).add(lookAt))
}

function reset(levelIndex) {

  // Resetando
  keyboard = new KeyboardState();
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  bullets = [];
  tanks = [];
  cannon = null;

  // Cores dos níveis
  let wallColor = wallColors[levelIndex];
  let floorColor = floorColors[levelIndex];

  // Arranjo do nível e direções de contorno
  let levelMatrix = levelMatrixes[levelIndex];
  let handMatrix = handMatrixes[levelIndex];

  // Intensidade das luzes
  let lightsIntensity = lightsIntensities[levelIndex];

  // Criando nível
  level = new Level(levelMatrix, handMatrix, wallColor, floorColor);
  
  // Após criação do nível, se for nível 2, criar postes de luz e canhão
  if (levelIndex == 2) {

    // ìndices máximos da matrix do nível
    let lastI = level.dimensions[0]-1;
    let lastJ = level.dimensions[1]-1;
    
    // Poste 1
    let lightPosition = Level.createLampPost(Level.blockPosition(level, 0, 0), -45)
    Level.createSpotlight(lightPosition, Level.blockPosition(level, 2, 2));
    // Poste 2
    lightPosition = Level.createLampPost(Level.blockPosition(level, lastI, lastJ), 135)
    Level.createSpotlight(lightPosition, Level.blockPosition(level, lastI-2, lastJ-2));
    // Poste 3
    lightPosition = Level.createLampPost(Level.blockPosition(level, lastI, lastJ/2), 90)
    Level.createSpotlight(lightPosition, Level.blockPosition(level, lastI-2, lastJ/2));
    // Poste 4
    lightPosition = Level.createLampPost(Level.blockPosition(level, 0, lastJ/2), -90)
    Level.createSpotlight(lightPosition, Level.blockPosition(level, 2, lastJ/2));

    // Canhão 
    cannon = new Cannon(Level.blockPosition(level, lastI/2, lastJ/2), 0.4);
  }

  // Criando luzes ambientes e direcional
  Level.createBasicLights(lightsIntensity[0], lightsIntensity[1]);

  // Recebendo spwans dos tanques
  let spawns = level.getSpawns();

  // Criando tanques, de acordo com spawns e adicionando ao array
  Object.keys(spawns).forEach(key => {  
    tanks.push(
      new Tank(spawns[key], initialRotationAngles[levelIndex][key],
               colors[key], key, controls[key])
    );
  });

  // Pegando referência do player
  tanks.forEach(tank => { if (tank.name == "P") player = tank; });

  // Iniciando com orbit desligado e atualizando a câmera
  orbit.enabled = false;
  updateCamera(tanks);
}

// Variáveis gerais
export let scene, renderer, camera, material, light, orbit;
scene = new THREE.Scene();                                   
camera = initCamera();    
renderer = new THREE.WebGLRenderer();                            

  // Configurando renderer e mapeamento de sombras
  document.getElementById("webgl-output").appendChild(renderer.domElement);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

orbit = new OrbitControls(camera, renderer.domElement);      

// Variáveis do nível
export let bullets, level, tanks, clockDelta, player;
let cannon, clock, keyboard;

// Iniciando jogo pelo nível dois
reset(1);

// Habilitando redimensionamento
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

// Iniciando renderização
render();


// ============================================================================

function render() {

  // Calcular delta time
  clockDelta = clock.getDelta()
  
  // Atualizando canhão
  if (cannon != null)
    cannon.update();

  // Atualiza teclado
  keyboard.update();
  
  // Seletor de nível
  if (keyboard.down("1")) reset(1);
  if (keyboard.down("2")) reset(2);

  // Atualiza os tanques
  tanks.forEach(tank => {

    // Atualiza controles
    tank.updateActions(keyboard);
    
    // Atualiza colisores
    tank.updateCollider();
    
    // Atualiza colisão com parede
    tank.updateCollisions();
    
    // Atualiza vida
    tank.updateLife();

    // Atualiza barra
    tank.bar.update();

    if (tank.life <= 0) {

      // Se player é destruído, volta do nível 1
      if (tank.name == "P") reset(1);
      // Se outro tanque é destruído, ele some
      else tank.selfDestruct();
      
      // Se sobrou só o player, repetir/ir para nível 2 
      if (tanks.length == 1 && tanks[0].name == "P") reset(2);
    }
  });
  
  // Atualiza posições, colisores e reflexões dos tiros
  Bullet.updatePositions();
  Bullet.updateColliders();
  Bullet.updateReflections();
  
  // Controla o toggle do orbit controller
  if (keyboard.down("O")) orbit.enabled = !orbit.enabled;

  // Atualiza câmera, se orbit controller estiver desligado
  if (!orbit.enabled) updateCamera();
  
  // Renderizando
  requestAnimationFrame(render);
  renderer.render(scene, camera); // Render scene
}