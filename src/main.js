


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

function detectMob() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

// ============================================================================

// Variáveis gerais
export let scene, renderer, camera, material, light, orbit, mobileMode;
mobileMode = detectMob();
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