


import * as THREE from "../build/three.module.js";
import KeyboardState from "../libs/util/KeyboardState.js";
import { OrbitControls } from "../build/jsm/controls/OrbitControls.js";
import { initCamera, onWindowResize } from "../libs/util/util.js";
import { TouchControls } from "./touchControls.js";
import { Audio } from "./audio.js";
import { LoadingScreen } from "./loadingScreen.js";

// Importações do projeto
import { Level } from "./level.js";
import { Tank } from "./tank.js";
import { Bullet } from "./bullet.js";
import { Cannon } from "./cannon.js";

// Importação de dados do jogo
import { 
  levelMatrixes, handMatrixes, lightsIntensities, 
  colors, initialRotationAngles 
} from './game_data.js';

// Constantes
const minDist = 40;
const maxZoomDelta = 38;
const aproxScale = 1.5;
const cameraAxe = new THREE.Vector3(0, 1, 1)
export const blockSize = 4;


// ============================================================================

function updateCamera(zoomMultiplier) {

  // Encontrando referência
  let playerPosition;
  tanks.forEach(tank => { if (tank.name == "P") playerPosition = tank.object.position; })
  
  // Aproximar e afastar proporcinalmente de acordo com o redimensionamento da tela
  // Considerando uma resolução ideal de 1920x1080
  let widthDistScaler = 1920/window.innerWidth;
  let heightDistScaler = 1*window.innerHeight/1080;

  // Escala total de distância
  let totalDistScale = minDist+zoomMultiplier+aproxScale*widthDistScaler*heightDistScaler;

  // Definir que câmera olhará pro centro de massa dos tanques
  camera.lookAt(playerPosition);
  camera.position.copy(cameraAxe.clone().multiplyScalar(totalDistScale).add(playerPosition))
}

export function reset(levelIndex) {

  // Verificando god mode anterior 
  let godMode = false;

  if (player)
    godMode = player.godMode;

  // Tirar pause
  loadingScreen.pause = false;

  // Resetando teclado
  KeyboardState.status = {}
  
  // Resetando variáveis
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  bullets = [];
  tanks = [];
  cannon = null;
  zoom = 0;

  // Skybox
  scene.background = skybox;

  // Arranjo do nível e direções de contorno
  let levelMatrix = levelMatrixes[levelIndex];
  let handMatrix = handMatrixes[levelIndex];

  let lightsIntensity = lightsIntensities[levelIndex];

  // Criando nível
  level = new Level(levelIndex, levelMatrix, handMatrix);
  
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

  // Recebendo spawns dos tanques
  let spawns = level.getSpawns();

  // Criando tanques, de acordo com spawns e adicionando ao array
  Object.keys(spawns).forEach(key => {  
    tanks.push(
      new Tank(spawns[key], initialRotationAngles[levelIndex][key], colors[key], key)
    );
  });

  // Pegando referência do player
  tanks.forEach(tank => { if (tank.name == "P") player = tank; });

  // Mantendo god mode após renascer
  player.godMode = godMode;

  // Iniciando com orbit desligado e atualizando a câmera
  orbit.enabled = false;
  updateCamera(tanks);

  // Tocando som do portão
  if (levelIndex != 1)
    audio.playSound("gate", 0.5);
}

// ============================================================================

// Variáveis gerais
export let scene, renderer, camera, material, light, orbit, mobileMode;
scene = new THREE.Scene();                                   
camera = initCamera();    
renderer = new THREE.WebGLRenderer();     
  document.getElementById("webgl-output").appendChild(renderer.domElement);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

orbit = new OrbitControls(camera, renderer.domElement);      

// Variáveis do nível
export let bullets, level, tanks, clockDelta, player, touchControls, audio;
let cannon, clock, keyboard;

// Skybox urls
let urls = [];
let root = "assets/skyboxes/indigo-re-skybox/";
let prefixes = ["ft", "bk", "up","dn", "rt", "lf" ]
let format = ".jpg"
prefixes.forEach(prefix => {
  urls.push(root + prefix + format)
})
let skybox = new THREE.CubeTextureLoader().load(urls);

// Audio
let audioListener = new THREE.AudioListener();
audio = new Audio(audioListener);

// Zoom
let zoom, scroll = 0;

// ============================================================================

// Joystick
mobileMode = document.getElementById("main").getAttribute("data-mobile") == "true";
touchControls = new TouchControls();
if (!mobileMode) touchControls.deleteUI();

// keyboard
keyboard = new KeyboardState();

// Tela de carregamento
export let loadingScreen = new LoadingScreen();

// Habilitando redimensionamento
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

// Sobrescrevendo modo noite
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.remove('dark-theme');
}

// ======= CHECANDO ORITAÇÂO E SOCLICITANDO QUE ROTACIONE  ====================

if (mobileMode) {
  
  function checkOrientation() {
    if (window.innerWidth < window.innerHeight) {
      // In portrait mode, show the warning overlay
      document.getElementById('rotate-warning').classList.add('active');
    } else {
      // In landscape mode, hide the warning overlay
      document.getElementById('rotate-warning').classList.remove('active');
    }
  }

  function onOrientationChange() {
    document.body.scrollLeft = 0;
    document.body.scrollRight = 0; 
  }

  // Run the check on page load and screen resize
  window.addEventListener('orientationchange', onOrientationChange);
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('load', checkOrientation);
  onOrientationChange();
  checkOrientation();
}

// ============================================================================

// Atualizando scroll do mouse
document.addEventListener( 'wheel', (event) => {
  if (!mobileMode)
    scroll = event.deltaY;
});

// ============================================================================

export function render() {

  // Atualizando posição dos blocos
  level.updateBlocksPosition();

  // Calcular delta time
  clockDelta = clock.getDelta()

  // Atualiza estado da trilha
  audio.updateOst();

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
  if (keyboard.down("3")) reset(3);

  // Liga e desligfa mudo
  if (keyboard.down("P")) 
    audio.mute = !audio.mute;
  
  if (!loadingScreen.pause) {

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
        if (tank.name == "P") loadingScreen.gameOver();
        // Se outro tanque é destruído, ele some
        else tank.selfDestruct();

        // Se sobrou só o player, ir para nível seguinte
        if (tanks.length == 1 && tanks[0].name == "P") {
          
          // Indicar vitória, ou seguir pro próximo nível
          if (level.levelIndex == 3) {
            loadingScreen.gameOver(true);
          }
          
          else {
            reset(level.levelIndex + 1);
          }
        }
      }
    });
    
    // Atualiza posições, colisores e reflexões dos tiros
    Bullet.updatePositions();
    Bullet.updateColliders();
    Bullet.updateReflections();

    // Atualia animação do powerUp
    level.updateLevelPowerUp(player);

  }

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