/**
 * Punto de entrada: crea el juego de Phaser a pantalla completa.
 */
import Phaser from 'phaser';
import { CityScene } from './scenes/CityScene';
import './ui/styles.css';

const game = new Phaser.Game({
  type: Phaser.AUTO, // WebGL si está disponible; si no, Canvas
  parent: 'game',
  backgroundColor: '#111111',
  banner: false,
  // Sin audio en esta versión: evita el aviso del navegador sobre AudioContext.
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.RESIZE, // el canvas ocupa siempre toda la ventana
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  scene: [CityScene],
});

// Acceso cómodo desde la consola del navegador para trastear: window.__XCITY__
declare global {
  interface Window {
    __XCITY__?: Phaser.Game;
  }
}
window.__XCITY__ = game;
