import * as THREE from "../build/three.module.js";
import { OrbitControls } from "../build/jsm/controls/OrbitControls.js";
import KeyboardState from "../libs/util/KeyboardState.js";
import { initCamera, onWindowResize, onOrientationChange } from "../libs/util/util.js";
import { Buttons } from "../libs/other/buttons.js";
import {ColladaLoader} from '../build/jsm/loaders/ColladaLoader.js';

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
const minDist = 40;
const maxZoomDelta = 38;
const aproxScale = 1.5;
const cameraAxe = new THREE.Vector3(0, 1, 1)
export const blockSize = 4;

// ============================================================================

class TouchControls {
  constructor() {

    // ============= JOYSTICK ==========================================

    // Posição e direção do Joystick
    let screenRate = [0.9, 0.05] 
    this.joystickVector = new THREE.Vector2(0,0);
    
    // Atributo joystick
    this.joystick = nipplejs.create({
      zone: document.getElementById('joystickWrapper1'),
      mode: 'static',
      position: { bottom: "100px", left: "100px" }
    });

    // Attactching listeners
    this.joystick.on('move', function (evt, data) {
      touchControls.joystickVector = new THREE.Vector3(-data.vector.x, 0, data.vector.y).normalize()
    })
  
    this.joystick.on('end', function (evt) {
      touchControls.joystickVector = new THREE.Vector2(0,0);
    })

    // ============= BOTÕES ============================================

    this.shootPressed = false;
    this.shootPressedLastFrame = false;
    this.shootDown = false;

    // Listerners
    function onButtonDown(event) {
      switch(event.target.id)
      {
        case "A":
          touchControls.shootPressed = true;
         break;
        case "mute":
          // MUTE FUNCTION
        break;    
        case "full":
          touchControls.buttons.setFullScreen();
        break;    
      }
    }
    
    function onButtonUp(event) {
      touchControls.shootPressed = false;
    }

    // Atributo botões
    this.buttons = new Buttons(onButtonDown, onButtonUp);
  }

  update() {

    this.shootDown = (!this.shootPressedLastFrame && this.shootPressed)
    this.shootPressedLastFrame = this.shootPressed;
  }

  deleteUI() {

    let elements = [
      document.getElementById("joystickWrapper1"),
      document.getElementById("full"),
      document.getElementById("som"),
      document.getElementById("A")
    ];

    elements.forEach(element => {element.remove()});

  }
}

// ============================================================================

function updateCamera(zoomMultiplier) {

  /* 
  // ----- Este trecho encontra o centro de massa dos tanques -----
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
  */
 
  // Encontrando referência
  let playerPosition;
  tanks.forEach(tank => { if (tank.name == "P") playerPosition = tank.object.position; })
  
  // Aproximar e afastar proporcinalmente de acordo com o redimensionamento da tela
  // Considerando uma resolução ideal de 1920x1080
  let widthDistScaler = 1920/window.innerWidth;
  let heightDistScaler = 1*window.innerHeight/1080;

  // Aplicando zoom
  //zoomMultiplier = 1/zoomMultiplier;

  // Escala total de distância
  let totalDistScale = minDist+zoomMultiplier+aproxScale*widthDistScaler*heightDistScaler;

  // Definir que câmera olhará pro centro de massa dos tanques
  camera.lookAt(playerPosition);
  // Definir distância da câmera de acordo com o escala total de distância calculada
  camera.position.copy(cameraAxe.clone().multiplyScalar(totalDistScale).add(playerPosition))
}

function reset(levelIndex) {

  // Resetando
  keyboard = new KeyboardState();
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  bullets = [];
  tanks = [];
  cannon = null;
  zoom = 0;

  // Skybox
  scene.background = new THREE.CubeTextureLoader().load(urls);

  // Cores dos níveis
  let wallColor = wallColors[levelIndex];
  let floorColor = floorColors[levelIndex];

  // Arranjo do nível e direções de contorno
  let levelMatrix = levelMatrixes[levelIndex];
  let handMatrix = handMatrixes[levelIndex];

  // Intensidade das luzes
  let lightsIntensity = lightsIntensities[levelIndex];

  // Criando nível
  level = new Level(levelIndex, levelMatrix, handMatrix, wallColor, floorColor);
  
  // Após criação do nível, se for nível 2, criar postes de luz e canhão
  if (levelIndex == 2) {

    // ìndices máximos da matrix do nível
    let lastI = level.dimensions[0]-1;
    let lastJ = level.dimensions[1]-1;
    
    // Poste 1
    let lightPosition = Level.createLampPost(Level.blockPosition(level, 0, 0), -45)
    Level.createSpotlight(lightPosition,     Level.blockPosition(level, 2, 2));
    // Poste 2
    lightPosition = Level.createLampPost(Level.blockPosition(level, lastI,   lastJ), 135)
    Level.createSpotlight(lightPosition, Level.blockPosition(level, lastI-2, lastJ-2));
    // Poste 3
    lightPosition = Level.createLampPost(Level.blockPosition(level, lastI,   lastJ/2), 90)
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

// ============================================================================

// Loading screen
// Ver exemplo com calma
// Evitar criar do zero

// ============================================================================

// Variáveis gerais
export let scene, renderer, camera, material, light, orbit, mobileMode;
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
export let bullets, level, tanks, clockDelta, player, touchControls;
let cannon, clock, keyboard;

// Skybox urls
let urls = [];
let root = "assets/skyboxes/indigo-re-skybox/";
let prefixes = ["ft", "bk", "up","dn", "rt", "lf" ]
let format = ".jpg"
prefixes.forEach(prefix => {
  urls.push(root + prefix + format)
})

// Zoom
let zoom, scroll = 0;

// ============================================================================



// ============================================================================

// Iniciando jogo pelo primeiro nível
reset(1);

// Joystick
mobileMode = document.getElementById("main").getAttribute("data-mobile") == "true";
touchControls = new TouchControls();
if (!mobileMode) touchControls.deleteUI();

// Habilitando redimensionamento
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);
window.addEventListener( 'orientationchange', onOrientationChange );

// Atualizando scroll do mouse
document.addEventListener( 'wheel', (event) => {
  scroll = event.deltaY;
});

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

  // Atualiza touch
  touchControls.update();
  
  // Seletor de nível
  if (keyboard.down("1")) reset(1);
  if (keyboard.down("2")) reset(2);

  // Liga e desliga god mode
  if (keyboard.down("G")) 
    player.godMode = !player.godMode

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
      // Se sobrou só o player, repetir/ir para nível 2 ---> MUDAR AQUI
      if (tanks.length == 1 && tanks[0].name == "P") reset(2);
    }
  });
  
  // Atualiza posições, colisores e reflexões dos tiros
  Bullet.updatePositions();
  Bullet.updateColliders();
  Bullet.updateReflections();

  // Atualia animação do powerUp
  level.updatePowerUp(player);

  // Controla o toggle do orbit controller
  if (keyboard.down("O")) orbit.enabled = !orbit.enabled;

  // Altera o zoom de acordo com o scroll, e valida
  if (!orbit.enabled) {
    zoom += scroll/50;
    zoom = (zoom < -maxZoomDelta) ? -maxZoomDelta : zoom;
    zoom = (zoom > 1.5*maxZoomDelta) ? 1.5*maxZoomDelta : zoom;  
    // Força default do scroll
    scroll = 0;
  }

  // Atualiza câmera (de acordo com o zoom), se orbit controller estiver desligado
  if (!orbit.enabled) updateCamera(zoom);
  
  // Renderizando
  requestAnimationFrame(render);
  renderer.render(scene, camera); // Render scene
}