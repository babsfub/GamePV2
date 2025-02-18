import { Application, Container, Graphics, Text } from 'pixi.js';
import { TetrisEngine } from './pkg/tetris_engine.js';
import type { TetrisState } from '$lib/types.js';

interface TetrisPiece {
  shape: number[][];
  x: number;
  y: number;
  piece_type: number;
}

interface TetrisBoard {
  board: number[][];
  ghost_piece?: TetrisPiece;
  current_piece?: TetrisPiece;
  next_piece?: TetrisPiece;
  is_paused: boolean;
  is_game_over: boolean;
}

export class SpeedBlock {
  private app!: Application;
  private gameContainer!: Container;
  private nextPiecesContainer!: Container;
  private engine: TetrisEngine;
  private gameElement: HTMLElement;
  private isFullscreen: boolean = false;
  private lastState: string | null = null;

  // Constants
  private readonly BLOCK_SIZE = 30;
  private readonly BOARD_WIDTH = 10;
  private readonly BOARD_HEIGHT = 20;
  private readonly COLORS = [
    0x000000, // empty
    0xFF0000, // I
    0x00FF00, // O
    0x0000FF, // T
    0xFFFF00, // L
    0xFF00FF, // J
    0x00FFFF, // S
    0xFFA500  // Z
  ];

  // State callbacks
  private onStateChange?: (state: TetrisState) => void;
  private onGameOver?: () => void;

  constructor(element: HTMLElement) {
    this.gameElement = element;
    this.engine = new TetrisEngine(this.BOARD_WIDTH, this.BOARD_HEIGHT);
    this.initPixiJS();
    this.setupEventListeners();
  }

  private initPixiJS() {
    this.app = new Application({
      width: this.BLOCK_SIZE * this.BOARD_WIDTH,
      height: this.BLOCK_SIZE * this.BOARD_HEIGHT,
      backgroundColor: 0x1a1a1a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: 'high-performance',
      clearBeforeRender: true
    });

    this.gameElement.appendChild(this.app.view as HTMLCanvasElement);

    this.gameContainer = new Container();
    this.nextPiecesContainer = new Container();
    
    this.app.stage.addChild(this.gameContainer);
    this.app.stage.addChild(this.nextPiecesContainer);

    this.setupGameLoop();
  }

  private setupGameLoop() {
    this.app.ticker.add(() => {
      const state = this.engine.get_state() as TetrisBoard;
      if (!this.engine || state?.is_paused || state?.is_game_over) {
        return;
      }
      this.engine.update(Date.now());
      this.updateState();
    });
  }

  private setupEventListeners() {
    const boundKeydown = this.handleKeydown.bind(this);
    const boundKeyup = this.handleKeyup.bind(this);
    const boundResize = this.handleResize.bind(this);
    const boundFullscreenChange = this.handleFullscreenChange.bind(this);

    window.addEventListener('keydown', boundKeydown);
    window.addEventListener('keyup', boundKeyup);
    window.addEventListener('resize', boundResize);
    document.addEventListener('fullscreenchange', boundFullscreenChange);
  }

  private createBlock(color: number): Graphics {
    const block = new Graphics();
    
    // Main block
    block.beginFill(color);
    block.drawRect(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
    block.endFill();
    
    // Light effect
    block.beginFill(0xFFFFFF, 0.3);
    block.drawRect(0, 0, this.BLOCK_SIZE, 2);
    block.drawRect(0, 0, 2, this.BLOCK_SIZE);
    block.endFill();
    
    // Shadow effect
    block.beginFill(0x000000, 0.3);
    block.drawRect(this.BLOCK_SIZE - 2, 0, 2, this.BLOCK_SIZE);
    block.drawRect(0, this.BLOCK_SIZE - 2, this.BLOCK_SIZE, 2);
    block.endFill();
    
    return block;
  }

  private drawGrid(): Graphics {
    const grid = new Graphics();
    grid.lineStyle(1, 0x333333, 1);
    
    // Vertical lines
    for (let i = 0; i <= this.BOARD_WIDTH; i++) {
      grid.moveTo(i * this.BLOCK_SIZE, 0);
      grid.lineTo(i * this.BLOCK_SIZE, this.BOARD_HEIGHT * this.BLOCK_SIZE);
    }
    
    // Horizontal lines
    for (let i = 0; i <= this.BOARD_HEIGHT; i++) {
      grid.moveTo(0, i * this.BLOCK_SIZE);
      grid.lineTo(this.BOARD_WIDTH * this.BLOCK_SIZE, i * this.BLOCK_SIZE);
    }
    
    return grid;
  }

  private renderBoard() {
    const state = this.engine.get_state() as TetrisBoard;
    if (!state) return;

    // Éviter les re-rendus inutiles
    const stateString = JSON.stringify(state);
    if (this.lastState === stateString) {
      return;
    }
    this.lastState = stateString;

    this.gameContainer.removeChildren();
    this.gameContainer.addChild(this.drawGrid());

    // Render fixed blocks
    state.board.forEach((row: number[], y: number) => {
      row.forEach((cell: number, x: number) => {
        if (cell !== 0) {
          const block = this.createBlock(this.COLORS[cell]);
          block.position.set(x * this.BLOCK_SIZE, y * this.BLOCK_SIZE);
          this.gameContainer.addChild(block);
        }
      });
    });

    // Render ghost piece
    if (state.ghost_piece) {
      const ghost = state.ghost_piece;
      ghost.shape.forEach((row: number[], y: number) => {
        row.forEach((cell: number, x: number) => {
          if (cell !== 0) {
            const block = this.createBlock(this.COLORS[ghost.piece_type]);
            block.alpha = 0.3;
            block.position.set(
              (ghost.x + x) * this.BLOCK_SIZE,
              (ghost.y + y) * this.BLOCK_SIZE
            );
            this.gameContainer.addChild(block);
          }
        });
      });
    }

    // Render current piece
    if (state.current_piece) {
      const piece = state.current_piece;
      piece.shape.forEach((row: number[], y: number) => {
        row.forEach((cell: number, x: number) => {
          if (cell !== 0) {
            const block = this.createBlock(this.COLORS[piece.piece_type]);
            block.position.set(
              (piece.x + x) * this.BLOCK_SIZE,
              (piece.y + y) * this.BLOCK_SIZE
            );
            this.gameContainer.addChild(block);
          }
        });
      });
    }
  }

  private renderNextPieces() {
    const state = this.engine.get_state() as TetrisBoard;
    if (!state?.next_piece) return;

    this.nextPiecesContainer.removeChildren();

    // Create container for next piece preview
    const previewContainer = new Container();
    previewContainer.position.set(
      (this.BOARD_WIDTH + 1) * this.BLOCK_SIZE,
      2 * this.BLOCK_SIZE
    );

    // Add "Next" text
    const nextText = new Text('NEXT', {
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0xFFFFFF,
    });
    nextText.position.set(0, -30);
    previewContainer.addChild(nextText);

    // Render next piece
    const piece = state.next_piece;
    piece.shape.forEach((row: number[], y: number) => {
      row.forEach((cell: number, x: number) => {
        if (cell !== 0) {
          const block = this.createBlock(this.COLORS[piece.piece_type]);
          block.position.set(
            x * this.BLOCK_SIZE,
            y * this.BLOCK_SIZE
          );
          previewContainer.addChild(block);
        }
      });
    });

    this.nextPiecesContainer.addChild(previewContainer);
  }

  private updateState() {
    const state = this.engine.get_state() as TetrisState;
    if (!state) return;

    this.renderBoard();
    this.renderNextPieces();

    if (this.onStateChange) {
      this.onStateChange(state);
    }

    if (state.is_game_over && this.onGameOver) {
      this.onGameOver();
    }
  }

  private handleKeydown(event: KeyboardEvent) {
    if (!this.engine || !(event instanceof KeyboardEvent)) return;

    switch (event.code) {
      case 'ArrowLeft':
        this.engine.move_piece(-1);
        break;
      case 'ArrowRight':
        this.engine.move_piece(1);
        break;
      case 'ArrowDown':
        this.engine.start_soft_drop();
        break;
      case 'ArrowUp':
        this.engine.rotate();
        break;
      case 'Space':
        this.engine.hard_drop();
        break;
      case 'KeyC':
        this.engine.hold();
        break;
      case 'Escape':
        this.engine.toggle_pause();
        break;
    }

    this.updateState();
  }

  private handleKeyup(event: KeyboardEvent) {
    if (!this.engine || !(event instanceof KeyboardEvent)) return;

    if (event.code === 'ArrowDown') {
      this.engine.end_soft_drop();
      this.updateState();
    }
  }

  private handleResize() {
    this.resizeGame();
  }

  private handleFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
    this.resizeGame();
  }

  private resizeGame() {
    if (!this.app || !this.gameElement) return;

    const newWidth = this.isFullscreen 
      ? window.innerWidth 
      : this.BLOCK_SIZE * (this.BOARD_WIDTH + 6);
    const newHeight = this.isFullscreen
      ? window.innerHeight
      : this.BLOCK_SIZE * this.BOARD_HEIGHT;

    this.app.renderer.resize(newWidth, newHeight);

    const scale = Math.min(
      newWidth / (this.BLOCK_SIZE * (this.BOARD_WIDTH + 6)),
      newHeight / (this.BLOCK_SIZE * this.BOARD_HEIGHT)
    ) * 0.8;

    this.gameContainer.scale.set(scale);
    this.nextPiecesContainer.scale.set(scale);

    // Center the game board
    this.gameContainer.position.set(
      (newWidth - this.BLOCK_SIZE * this.BOARD_WIDTH * scale) / 2,
      (newHeight - this.BLOCK_SIZE * this.BOARD_HEIGHT * scale) / 2
    );

    // Position the next pieces container
    this.nextPiecesContainer.position.set(
      this.gameContainer.x + (this.BLOCK_SIZE * this.BOARD_WIDTH * scale) + 20,
      this.gameContainer.y
    );
  }

  public async toggleFullscreen() {
    try {
      if (!this.isFullscreen) {
        await this.gameElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }

  public start() {
    this.engine.start();
    this.updateState();
  }

  public pause() {
    this.engine.toggle_pause();
    this.updateState();
  }

  public reset() {
    this.engine.free();
    this.engine = new TetrisEngine(this.BOARD_WIDTH, this.BOARD_HEIGHT);
    this.start();
  }

  public destroy() {
    this.app.ticker.destroy();
    this.app.destroy(true, {
      children: true,
      texture: true
      
    });
    this.engine.free();
    
    const boundKeydown = this.handleKeydown.bind(this);
    const boundKeyup = this.handleKeyup.bind(this);
    const boundResize = this.handleResize.bind(this);
    const boundFullscreenChange = this.handleFullscreenChange.bind(this);

    window.removeEventListener('keydown', boundKeydown);
    window.removeEventListener('keyup', boundKeyup);
    window.removeEventListener('resize', boundResize);
    document.removeEventListener('fullscreenchange', boundFullscreenChange);
  }

  public setStateChangeCallback(callback: (state: TetrisState) => void) {
    if (typeof callback !== 'function') {
      throw new Error('State change callback must be a function');
    }
    this.onStateChange = callback;
  }

  public setGameOverCallback(callback: () => void) {
    if (typeof callback !== 'function') {
      throw new Error('Game over callback must be a function');
    }
    this.onGameOver = callback;
  }

  public getState(): TetrisState {
    return this.engine.get_state();
  }

  public getScoreHash(playerAddress: string, saltKey: string, blockNumber: bigint): Uint8Array {
    return this.engine.get_score_hash(playerAddress, saltKey, blockNumber);
  }
}