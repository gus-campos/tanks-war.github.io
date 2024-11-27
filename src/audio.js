import * as THREE from "../build/three.module.js";
import { audio } from "./main.js";

export class Audio {
  constructor(listener) {
    
    this.mute = false;
    this.previousMute = false;
    this.listener = listener;
    this.audioLoader = new THREE.AudioLoader();
    this.sounds = {

      "shot" : 'assets/audio/pewPew.wav',
      "bonk" : 'assets/audio/boom.mp3',
      "ost"  : 'assets/audio/astronaut.wav',
      "gate" : 'assets/audio/gate.mp3'
    } 

    this.ostAudio = new THREE.Audio(this.listener);
    this.gate = new THREE.Audio(this.listener);

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