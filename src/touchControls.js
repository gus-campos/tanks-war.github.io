import * as THREE from "../build/three.module.js";
import { Buttons } from "../libs/other/buttons.js";
import { clockDelta } from "./main.js";
import { touchControls } from "./main.js";

export class TouchControls {
  constructor() {

    // ============= JOYSTICK ==========================================

    // Posição e direção do Joystick
    this.joystickVector = new THREE.Vector2(0,0);
    
    // Atributo joystick
    this.joystick = nipplejs.create({
      zone: document.getElementById('joystick'),
      mode: 'static',
      position: { bottom: "100px", left: "100px" },
      color: "white"
    });
    
    this.joystick[0].el.style.zIndex = 0;

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

    /*
    Atualiza flags do joystick
    */

    this.shootDown = (!this.shootPressedLastFrame && this.shootPressed)
    this.shootPressedLastFrame = this.shootPressed;

    // Decrementando timer do mute
    this.muteTimer -= clockDelta;
  }

  deleteUI() {

    /*
    Apga elementos de UI referetes
    */

    let elements = [
      document.getElementById("joystick"),
      document.getElementById("full"),
      document.getElementById("som"),
      document.getElementById("A")
    ];

    elements.forEach(element => {element.remove()});

  }
}