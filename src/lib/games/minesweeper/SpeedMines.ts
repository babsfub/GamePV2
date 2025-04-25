// lib/games/minesweeper/SpeedMines.ts
import { Application, Container, Graphics, Text } from 'pixi.js';
import { MinesweeperEngine } from './pkg/minesweeper.js';
import type { MinesweeperState, Cell } from '$lib/types.js';

export class SpeedMines {
  private app!: Application;
  private gameContainer!: Container;
  private engine: MinesweeperEngine;
  private gameElement: HTMLElement;
  private isFullscreen: boolean = false;
  private lastState: string | null = null;

  // Constants
  private readonly CELL_SIZE = 32;
  private readonly COLORS = {
    hidden: 0x9CA3AF,
    revealed: 0xE5E7EB,
    mine: 0xFF0000,
    numbers: [
      0x000000,
      0x0000FF, // 1: Blue
      0x008000, // 2: Green
      0xFF0000, // 3: Red
      0x000080, // 4: Navy
      0x800000, // 5: Maroon
      0x008080, // 6: Teal
      0x000000, // 7: Black
      0x808080  // 8: Gray
    ]
  };

  // State callbacks
  private onStateChange?: (state: MinesweeperState) => void;
  private onGameOver?: () => void;

  constructor(element: HTMLElement, stakeAmount: bigint) {
    this.gameElement = element;
    this.engine = new MinesweeperEngine(stakeAmount);
    this.initPixiJS();
      this.setupEventListeners();
    }
  
    private setupEventListeners() {
      // Add event listeners here
  }

  private initPixiJS() {
    const state = this.engine.get_state();
    const width = state.board[0].length * this.CELL_SIZE;
    const height = state.board.length * this.CELL_SIZE;

    this.app = new Application({
      width,
      height,
      backgroundColor: 0x2C3E50,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    this.gameElement.appendChild(this.app.view as HTMLCanvasElement);
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);
    
    // Prévention du clic droit
    (this.app.view as HTMLCanvasElement).addEventListener('contextmenu', e => e.preventDefault());
  }

  private createCell(isRevealed: boolean, content: number = 0): Graphics {
    const cell = new Graphics();
    
    // Background
    cell.beginFill(isRevealed ? this.COLORS.revealed : this.COLORS.hidden);
    cell.drawRect(0, 0, this.CELL_SIZE, this.CELL_SIZE);
    cell.endFill();
    
    // Border effects
    if (!isRevealed) {
      // Light effect pour cellules non révélées
      cell.beginFill(0xFFFFFF, 0.3);
      cell.drawRect(0, 0, this.CELL_SIZE, 2);
      cell.drawRect(0, 0, 2, this.CELL_SIZE);
      cell.endFill();
      
      cell.beginFill(0x000000, 0.3);
      cell.drawRect(this.CELL_SIZE - 2, 0, 2, this.CELL_SIZE);
      cell.drawRect(0, this.CELL_SIZE - 2, this.CELL_SIZE, 2);
      cell.endFill();
    }

    // Contenu pour cellules révélées
    if (isRevealed && content > 0) {
      const text = new Text(content.toString(), {
        fontFamily: 'Arial',
        fontSize: this.CELL_SIZE * 0.6,
        fill: this.COLORS.numbers[content],
        align: 'center',
      });
      text.position.set(
        (this.CELL_SIZE - text.width) / 2,
        (this.CELL_SIZE - text.height) / 2
      );
      cell.addChild(text);
    }
    
    return cell;
  }

  private renderBoard() {
    const state = this.engine.get_state();
    if (!state) return;

    const stateString = JSON.stringify(state);
    if (this.lastState === stateString) return;
    this.lastState = stateString;

    this.gameContainer.removeChildren();

    state.board.forEach((row: Cell[], y: number) => {
      row.forEach((cell: Cell, x: number) => {
        const cellSprite = this.createCell(
          cell.is_revealed,
          cell.is_revealed ? cell.adjacent_mines : 0
        );

        cellSprite.position.set(x * this.CELL_SIZE, y * this.CELL_SIZE);
        cellSprite.interactive = !cell.is_revealed;
        cellSprite.cursor = 'pointer';

        // Événements de clic
        cellSprite.on('pointerdown', (event) => {
          this.handleCellClick(x, y, event.button === 2);
        });

        this.gameContainer.addChild(cellSprite);

        // Affichage des drapeaux et mines
        if (cell.is_flagged || (cell.is_revealed && cell.has_mine)) {
          const symbol = new Graphics();
          symbol.beginFill(this.COLORS.mine);
          symbol.drawCircle(
            this.CELL_SIZE / 2,
            this.CELL_SIZE / 2,
            this.CELL_SIZE / 4
          );
          symbol.endFill();
          cellSprite.addChild(symbol);
        }
      });
    });
  }

  private handleCellClick(x: number, y: number, isRightClick: boolean) {
    if (!this.engine) return;

    const result = isRightClick 
      ? this.engine.toggle_flag(x, y)
      : this.engine.reveal_cell(x, y);

    const state = this.engine.get_state();
    this.renderBoard();

    if (this.onStateChange) {
      this.onStateChange(state);
    }

    if (state.is_game_over && this.onGameOver) {
      this.onGameOver();
    }
  }
  public setStateChangeCallback(callback: (state: MinesweeperState) => void) {
    this.onStateChange = callback;
  }

  public setGameOverCallback(callback: () => void) {
    this.onGameOver = callback;
  }

  // Méthode de destruction
  public destroy() {
    if (this.app) {
      this.app.destroy(true, {
        children: true,
        texture: true
      });
    }
    if (this.engine) {
      this.engine.free();
    }
  }

  // Méthode de plein écran
  public async toggleFullscreen() {
    if (!this.gameElement) return;

    try {
      if (!document.fullscreenElement) {
        await this.gameElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      this.handleResize();
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }

  private handleResize() {
    const state = this.engine.get_state();
    const width = state.board[0].length * this.CELL_SIZE;
    const height = state.board.length * this.CELL_SIZE;
    this.app.renderer.resize(width, height);
  }

  public getScoreHash(playerAddress: string, saltKey: string, blockNumber: bigint): Uint8Array {
    return this.engine.get_score_hash(playerAddress, saltKey, blockNumber);
  }
}


