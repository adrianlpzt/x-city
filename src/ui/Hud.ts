/**
 * HUD: barrio actual, contador de tweets leídos, ayuda de controles
 * (se oculta sola) y avisos (p. ej. proveedor no implementado).
 */
import { CONFIG } from '../config';
import { BARRIOS, type BarrioId } from '../world/barrios';
import { cssColor } from '../utils/format';

export class Hud {
  private readonly barrioEl: HTMLDivElement;
  private readonly barrioIcon: HTMLSpanElement;
  private readonly barrioName: HTMLSpanElement;
  private readonly readEl: HTMLDivElement;
  private readonly help: HTMLDivElement;
  private readonly notice: HTMLDivElement;
  private readonly noticeText: HTMLSpanElement;
  private readonly fade: HTMLDivElement;
  private helpTimer = 0;
  private readCount = 0;

  constructor(parent: HTMLElement) {
    const top = document.createElement('div');
    top.className = 'hud-top';

    this.barrioEl = document.createElement('div');
    this.barrioEl.className = 'hud-pill hud-barrio';
    this.barrioIcon = document.createElement('span');
    this.barrioName = document.createElement('span');
    this.barrioName.className = 'hud-barrio-name';
    this.barrioEl.append(this.barrioIcon, this.barrioName);

    this.readEl = document.createElement('div');
    this.readEl.className = 'hud-pill hud-read';
    this.readEl.title = 'Tweets leídos en esta sesión';

    top.append(this.barrioEl, this.readEl);

    this.help = document.createElement('div');
    this.help.className = 'hud-help';
    const rows: [string, string][] = [
      ['WASD / ←↑→↓', 'caminar'],
      ['Shift', 'correr'],
      ['M', 'barrios'],
      ['H', 'ayuda'],
      ['F3', 'debug'],
    ];
    for (const [k, v] of rows) {
      const row = document.createElement('div');
      const kbd = document.createElement('kbd');
      kbd.textContent = k;
      const label = document.createElement('span');
      label.textContent = v;
      row.append(kbd, label);
      this.help.appendChild(row);
    }

    this.notice = document.createElement('div');
    this.notice.className = 'hud-notice';
    this.notice.setAttribute('role', 'alert');
    this.noticeText = document.createElement('span');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '✕';
    close.title = 'Cerrar aviso';
    close.addEventListener('click', () => this.hideNotice());
    this.notice.append(this.noticeText, close);

    // Velo para los fundidos (complementa al fundido de la cámara de Phaser,
    // así también se funde la capa HTML).
    this.fade = document.createElement('div');
    this.fade.className = 'hud-fade';

    parent.append(top, this.help, this.notice, this.fade);
    this.setRead(0);
    this.showHelp();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && !e.repeat) this.toggleHelp();
    });
  }

  setBarrio(id: BarrioId): void {
    const t = BARRIOS[id];
    this.barrioIcon.textContent = t.icon;
    this.barrioName.textContent = t.name;
    this.barrioEl.style.setProperty('--accent', cssColor(t.accent));
    // Pequeño "pop" al cambiar
    this.barrioEl.classList.remove('pop');
    void this.barrioEl.offsetWidth;
    this.barrioEl.classList.add('pop');
  }

  incrementRead(): void {
    this.setRead(this.readCount + 1);
  }

  private setRead(n: number): void {
    this.readCount = n;
    this.readEl.textContent = `📖 ${n} ${n === 1 ? 'tweet leído' : 'tweets leídos'}`;
  }

  showHelp(): void {
    this.help.classList.add('visible');
    window.clearTimeout(this.helpTimer);
    this.helpTimer = window.setTimeout(() => this.help.classList.remove('visible'), CONFIG.ui.helpVisibleMs);
  }

  private toggleHelp(): void {
    if (this.help.classList.contains('visible')) {
      window.clearTimeout(this.helpTimer);
      this.help.classList.remove('visible');
    } else {
      this.showHelp();
    }
  }

  showNotice(text: string): void {
    this.noticeText.textContent = text;
    this.notice.classList.add('visible');
  }

  hideNotice(): void {
    this.notice.classList.remove('visible');
  }

  setFade(on: boolean): void {
    this.fade.style.transitionDuration = `${CONFIG.ui.transitionMs}ms`;
    this.fade.classList.toggle('on', on);
  }
}
