/**
 * Menú flotante de barrios (HTML/CSS sobre el canvas).
 * Ratón: clic en el botón redondo. Teclado: M abre/cierra, ↑/↓ navegan,
 * Enter elige, Esc cierra, y los números 1-8 eligen directamente.
 */
import { BARRIOS, BARRIO_IDS, type BarrioId } from '../world/barrios';
import { cssColor } from '../utils/format';

export class Menu {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLDivElement;
  private readonly items = new Map<BarrioId, HTMLButtonElement>();
  private current: BarrioId;
  private focusIndex = 0;
  private isOpen = false;

  /** Se llama al elegir un barrio distinto del actual. */
  onSelect: ((id: BarrioId) => void) | null = null;
  /** Se llama al abrir/cerrar (para bloquear el movimiento del jugador). */
  onToggle: ((open: boolean) => void) | null = null;

  constructor(parent: HTMLElement, current: BarrioId) {
    this.current = current;

    this.panel = document.createElement('div');
    this.panel.className = 'menu-panel';
    this.panel.setAttribute('role', 'menu');
    this.panel.setAttribute('aria-label', 'Barrios');
    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = 'Barrios';
    this.panel.appendChild(title);

    BARRIO_IDS.forEach((id, i) => {
      const theme = BARRIOS[id];
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'menu-item';
      item.setAttribute('role', 'menuitemradio');
      item.style.setProperty('--accent', cssColor(theme.accent));
      const icon = document.createElement('span');
      icon.className = 'menu-icon';
      icon.textContent = theme.icon;
      const name = document.createElement('span');
      name.className = 'menu-name';
      name.textContent = theme.name;
      const key = document.createElement('kbd');
      key.textContent = String(i + 1);
      item.append(icon, name, key);
      item.addEventListener('click', () => this.choose(id));
      item.addEventListener('mouseenter', () => this.setFocus(i));
      this.items.set(id, item);
      this.panel.appendChild(item);
    });

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'menu-button';
    this.button.title = 'Cambiar de barrio (M)';
    this.button.setAttribute('aria-haspopup', 'menu');
    this.button.addEventListener('click', () => this.toggle());

    parent.append(this.panel, this.button);
    this.setCurrent(current);

    window.addEventListener('keydown', (e) => this.onKey(e));
    // Cerrar al hacer clic fuera
    window.addEventListener('pointerdown', (e) => {
      if (this.isOpen && !this.panel.contains(e.target as Node) && e.target !== this.button) this.close();
    });
  }

  setCurrent(id: BarrioId): void {
    this.current = id;
    const theme = BARRIOS[id];
    this.button.textContent = theme.icon;
    this.button.style.setProperty('--accent', cssColor(theme.accent));
    for (const [bid, el] of this.items) {
      const active = bid === id;
      el.classList.toggle('current', active);
      el.setAttribute('aria-checked', String(active));
    }
  }

  get opened(): boolean {
    return this.isOpen;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.isOpen = true;
    this.panel.classList.add('open');
    this.button.classList.add('active');
    this.setFocus(BARRIO_IDS.indexOf(this.current));
    this.onToggle?.(true);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panel.classList.remove('open');
    this.button.classList.remove('active');
    this.onToggle?.(false);
  }

  private setFocus(index: number): void {
    this.focusIndex = (index + BARRIO_IDS.length) % BARRIO_IDS.length;
    BARRIO_IDS.forEach((id, i) => this.items.get(id)?.classList.toggle('focus', i === this.focusIndex));
  }

  private choose(id: BarrioId): void {
    this.close();
    if (id !== this.current) this.onSelect?.(id);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat && e.code === 'KeyM') return;
    if (e.code === 'KeyM') {
      e.preventDefault();
      this.toggle();
      return;
    }
    if (!this.isOpen) return;
    switch (e.code) {
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.setFocus(this.focusIndex + 1);
        break;
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        this.setFocus(this.focusIndex - 1);
        break;
      case 'Enter':
      case 'Space': {
        e.preventDefault();
        const id = BARRIO_IDS[this.focusIndex];
        if (id) this.choose(id);
        break;
      }
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      default: {
        const n = Number(e.key);
        const id = Number.isInteger(n) ? BARRIO_IDS[n - 1] : undefined;
        if (id) {
          e.preventDefault();
          this.choose(id);
        }
      }
    }
  }
}
