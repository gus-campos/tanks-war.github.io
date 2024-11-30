import { loadingScreen } from "./main.js";
import { reset } from "./main.js";
import { mobileMode } from "./main.js";
import { render } from "./main.js";
import { touchControls } from "./main.js";

export class LoadingScreen {
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