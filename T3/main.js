import * as THREE from "../build/three.module.js";
import { OrbitControls } from "../build/jsm/controls/OrbitControls.js";
import KeyboardState from "../libs/util/KeyboardState.js";
import { initCamera, onWindowResize } from "../libs/util/util.js";
import { Buttons } from "../libs/other/buttons.js";

// Importações do projeto
import { Level } from "./level.js";
import { Tank } from "./tank.js";
import { Bullet } from "./bullet.js";
import { Cannon } from "./cannon.js";

// Importação de dados do jogo
import { levelMatrixes, 
  handMatrixes, 
  lightsIntensities,
  colors, 
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
    this.joystickVector = new THREE.Vector2(0,0);
    
    // Atributo joystick
    this.joystick = nipplejs.create({
      zone: document.getElementById('joystickWrapper1'),
      mode: 'static',
      position: { bottom: "100px", left: "100px" }
    });

    // Setting z-index
    this.joystick[0].el.style.zIndex = 0;

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

    this.muteTimer = 0;
    
    // Listerners
    function onButtonDown(event) {

      switch(event.target.id)
      {
        case "A":
          touchControls.shootPressed = true;
          break;
        case "som":
          if (touchControls.muteTimer < 0) {
            audio.mute = !audio.mute;
            touchControls.muteTimer = 0.25;
          }
          break;    
        case "full":
          touchControls.buttons.setFullScreen();
        break;    
      }
    }
    
    function onButtonUp(event) {
      if (event.target.id == "A") {
        touchControls.shootPressed = false;
      }
    }
    
    // Atributo botões
    this.buttons = new Buttons(onButtonDown, onButtonUp);
  }

  update() {

    this.shootDown = (!this.shootPressedLastFrame && this.shootPressed)
    this.shootPressedLastFrame = this.shootPressed;

    // Decrementando timer do mute
    this.muteTimer -= clockDelta;
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

class LoadingScreen {
  constructor() {

    this.start = true;
    this.active = true;
    this.pause = true;

    this.screen = document.getElementById( 'loading-screen' );

    this.button  = document.getElementById("myBtn")
      this.button.style.backgroundColor = 'darkgreen';
      this.button.innerHTML = 'START';
      this.button.addEventListener("click", LoadingScreen.onButtonPressed);

    this.status = document.getElementById("status");
      this.status.innerHTML = 'TANKS WAR';
  }

  fadeOut() {
    
    this.active = false;
    this.pause = false;

    this.button.style.opacity = 0;
    this.screen.transition = 0;
    this.screen.classList.remove('fade-in');
    this.screen.classList.add( 'fade-out' );
  }

  fadeIn() {

    this.active = true;
    this.pause = true;

    this.button.style.opacity = 1;
    this.screen.transition = 0;
    this.screen.classList.remove('fade-out');
    this.screen.classList.add( 'fade-in' );
  }

  gameOver(win=false) {

    this.status.innerHTML = win ? 'VICTORY' : 'GAME OVER';
    this.button.innerHTML = win ? 'START OVER' : 'RETRY';

    this.fadeIn();
  }

  static onButtonPressed() {
    
    if (loadingScreen.active) {
      
      loadingScreen.fadeOut();
      
      // (Re)começar jogo
      reset(1);

      // Só da primeira vez
      if (loadingScreen.start) { 
        // Se mobile, full screen
        if (mobileMode) touchControls.buttons.setFullScreen();  
        // Render 
        render();
        loadingScreen.start = false;
      }
    }
  }
}

// ============================================================================

class Audio {
  constructor() {

    this.mute = false;
    this.previousMute = false;
    this.listener = new THREE.AudioListener();
    this.audioLoader = new THREE.AudioLoader();
    this.sounds = {

      "shot" : 'assets/audio/pewPew.wav',
      "bonk" : 'assets/audio/boom.mp3',
      "ost"  : 'assets/audio/astronaut.wav'
    } 

    this.ostAudio = new THREE.Audio(this.listener);

    this.audioLoader.load(this.sounds["ost"], function(buffer) {
      audio.ostAudio.setBuffer(buffer);
      audio.ostAudio.setLoop(true);
      audio.ostAudio.setVolume(3);
      audio.ostAudio.play();
    });
  }

  playSound(soundName, volume) {

    if (!this.mute) {

      const sound = new THREE.Audio(this.listener);
      this.audioLoader.load(this.sounds[soundName], function(buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(volume);
        sound.play();
      });
    }
  }

  updateOst() {

    if (this.mute)
      audio.ostAudio.stop();

    if (!this.mute && this.previousMute)
      audio.ostAudio.play();

    this.previousMute = this.mute;
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

  // Intensidade das luzes
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

  // Recebendo spwans dos tanques
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
}

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
audio = new Audio();

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
let loadingScreen = new LoadingScreen();

// Habilitando redimensionamento
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

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

function render() {

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
    level.updatePowerUp(player);

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