// src/lib/components/games/tetris/tetris.svelte.ts
import { writable, get } from 'svelte/store';
import { Application, Container, Graphics, Text } from 'pixi.js';

export interface TetrisGame {
 start: () => void;
 destroy: () => void;
 resume: () => void;
 score: number;
 level: number;
 lines: number;
 isGameOver: boolean;
 isPaused: boolean;
}

type TetrominoKey = keyof typeof TETROMINOS;

interface Piece {
 shape: number[][];
 color: number;
 x: number;
 y: number;
}

const TETROMINOS = {
 I: {
   shape: [[1], [1], [1], [1]],
   color: 0xff6666
 },
 O: {
   shape: [
     [2, 2],
     [2, 2]
   ],
   color: 0xffff66
 },
 T: {
   shape: [
     [0, 3, 0],
     [3, 3, 3]
   ],
   color: 0x66ffff
 },
 L: {
   shape: [
     [4, 0],
     [4, 0],
     [4, 4]
   ],
   color: 0xff9966
 },
 J: {
   shape: [
     [0, 5],
     [0, 5],
     [5, 5]
   ],
   color: 0x6666ff
 },
 S: {
   shape: [
     [0, 6, 6],
     [6, 6, 0]
   ],
   color: 0x66ff66
 },
 Z: {
   shape: [
     [7, 7, 0],
     [0, 7, 7]
   ],
   color: 0xff6666
 }
};

const POINTS_SYSTEM = {
 1: 100,  
 2: 300,  
 3: 500,  
 4: 800   
};

export async function createTetrisGame(canvas: HTMLCanvasElement): Promise<TetrisGame> {
 let BLOCK_SIZE: number;
 const BOARD_WIDTH = 10;
 const BOARD_HEIGHT = 20;

 const calculateGameDimensions = () => {
   const defaultDimensions = {
     width: 300,
     height: 600,
     blockSize: 30
   };
 
   if (typeof window === 'undefined') {
     return defaultDimensions;
   }
 
   const maxWidth = window.innerWidth * 0.8;
   const maxHeight = window.innerHeight * 0.8;
   
   let blockSize = Math.floor(Math.min(
     maxWidth / BOARD_WIDTH,
     maxHeight / BOARD_HEIGHT
   ));

   return {
     width: blockSize * BOARD_WIDTH,
     height: blockSize * BOARD_HEIGHT,
     blockSize
   };
 };

 const dimensions = calculateGameDimensions();
 BLOCK_SIZE = dimensions.blockSize;

 const app = new Application();
 await app.init({
   canvas,
   width: dimensions.width,
   height: dimensions.height,
   backgroundColor: 0x1a1a1a,
   antialias: false,
   hello: false
 });

 const boardStore = writable<number[][]>(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)));
 const scoreStore = writable(0);
 const levelStore = writable(1);
 const linesStore = writable(0);
 const isGameOverStore = writable(false);
 const isPausedStore = writable(false);
 const dropInterval = writable(1000);
 const timeSinceLastDrop = writable(0);

 const gameContainer = new Container();
 app.stage.addChild(gameContainer);

 const gridGraphics = new Graphics();
 gameContainer.addChild(gridGraphics);

 let currentPiece = randomTetromino();
 let lastRender = Date.now();

 function randomTetromino(): Piece {
   const keys = Object.keys(TETROMINOS);
   const randKey = keys[(Math.random() * keys.length) | 0] as TetrominoKey;
   const tetro = TETROMINOS[randKey];
   return {
     shape: tetro.shape.map(row => [...row]),
     color: tetro.color,
     x: 3,
     y: 0
   };
 }

 function collision(board: number[][], piece: Piece, offsetX: number, offsetY: number): boolean {
   const { shape } = piece;
   for (let row = 0; row < shape.length; row++) {
     for (let col = 0; col < shape[row].length; col++) {
       if (shape[row][col]) {
         const newX = piece.x + col + offsetX;
         const newY = piece.y + row + offsetY;
         if (piece.y + row <= 0 && board[0][newX] !== 0) {
           isGameOverStore.set(true);
           return true;
         }
         if (
           newX < 0 ||
           newX >= board[0].length ||
           newY >= board.length ||
           (newY >= 0 && board[newY][newX])
         ) {
           return true;
         }
       }
     }
   }
   return false;
 }

 function merge(board: number[][], piece: Piece): void {
   for (let row = 0; row < piece.shape.length; row++) {
     for (let col = 0; col < piece.shape[row].length; col++) {
       if (piece.shape[row][col]) {
         const newY = piece.y + row;
         const newX = piece.x + col;
         if (newY >= 0) {
           board[newY][newX] = piece.shape[row][col];
         }
       }
     }
   }
 }

 function checkLineClear(board: number[][]): number {
   let linesCleared = 0;
   for (let y = board.length - 1; y >= 0; y--) {
     if (board[y].every(cell => cell !== 0)) {
       board.splice(y, 1);
       board.unshift(new Array(board[0].length).fill(0));
       linesCleared++;
       y++;
     }
   }
   return linesCleared;
 }

 function togglePause() {
   if (get(isGameOverStore)) return;
   isPausedStore.update(paused => !paused);
   if (!get(isPausedStore)) {
     lastRender = Date.now(); // Reset timing when unpausing
   }
   render();
 }

 function drawGrid() {
   gridGraphics.clear();    
   gridGraphics.stroke({
     width: 1,
     color: 0x333333,
     alpha: 1
   });

   for (let x = 0; x <= BOARD_WIDTH; x++) {
     gridGraphics.moveTo(x * BLOCK_SIZE, 0);
     gridGraphics.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
   }

   for (let y = 0; y <= BOARD_HEIGHT; y++) {
     gridGraphics.moveTo(0, y * BLOCK_SIZE);
     gridGraphics.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
   }
 }

 function updateScore(linesCleared: number) {
   const level = get(levelStore);
   const basePoints = POINTS_SYSTEM[linesCleared as keyof typeof POINTS_SYSTEM] || 0;
   const points = basePoints * level;
   
   scoreStore.update(currentScore => {
     console.log('Score updated:', currentScore + points);
     return currentScore + points;
   });

   linesStore.update(lines => {
     const newLines = lines + linesCleared;
     levelStore.update(currentLevel => {
       const newLevel = Math.floor(newLines / 10) + 1;
       if (newLevel !== currentLevel) {
         dropInterval.set(Math.max(100, 1000 - (newLevel - 1) * 50));
       }
       return newLevel;
     });
     return newLines;
   });
 }

 function render() {
   gridGraphics.clear();
   drawGrid();

   const board = get(boardStore);
   const isPaused = get(isPausedStore);
   
   // Cleanup previous text elements
   while (gameContainer.children.length > 1) { // Keep only gridGraphics
     gameContainer.removeChildAt(1);
   }
   
   // Rendu du board
   for (let y = 0; y < BOARD_HEIGHT; y++) {
     for (let x = 0; x < BOARD_WIDTH; x++) {
       if (board[y][x]) {
         const tetroIndex = board[y][x] - 1;
         const color = TETROMINOS[Object.keys(TETROMINOS)[tetroIndex] as TetrominoKey].color;
         gridGraphics
           .rect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
           .fill({ color });
       }
     }
   }

   // Render current piece if game is not paused
   if (currentPiece && !isPaused) {
     for (let y = 0; y < currentPiece.shape.length; y++) {
       for (let x = 0; x < currentPiece.shape[y].length; x++) {
         if (currentPiece.shape[y][x]) {
           gridGraphics
             .rect(
               (currentPiece.x + x) * BLOCK_SIZE,
               (currentPiece.y + y) * BLOCK_SIZE,
               BLOCK_SIZE,
               BLOCK_SIZE
             )
             .fill({ color: currentPiece.color });
         }
       }
     }
   }

   if (isPaused) {
     gridGraphics
       .rect(0, 0, BOARD_WIDTH * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE)
       .fill({ color: 0x000000, alpha: 0.5 });

     const pauseText = new Text('PAUSED', {
       fontFamily: 'Arial',
       fontSize: BLOCK_SIZE * 1.5,
       fill: 0xffffff,
     });
     pauseText.x = (BOARD_WIDTH * BLOCK_SIZE - pauseText.width) / 2;
     pauseText.y = (BOARD_HEIGHT * BLOCK_SIZE - pauseText.height) / 3;
     gameContainer.addChild(pauseText);

     const resumeText = new Text('Press ESC to resume', {
       fontFamily: 'Arial',
       fontSize: BLOCK_SIZE * 0.75,
       fill: 0xffffff,
     });
     resumeText.x = (BOARD_WIDTH * BLOCK_SIZE - resumeText.width) / 2;
     resumeText.y = pauseText.y + pauseText.height + BLOCK_SIZE;
     gameContainer.addChild(resumeText);

     const restartText = new Text('Press R to restart', {
       fontFamily: 'Arial',
       fontSize: BLOCK_SIZE * 0.75,
       fill: 0xffffff,
     });
     restartText.x = (BOARD_WIDTH * BLOCK_SIZE - restartText.width) / 2;
     restartText.y = resumeText.y + resumeText.height + BLOCK_SIZE;
     gameContainer.addChild(restartText);
   }

   if (get(isGameOverStore)) {
     gridGraphics
       .rect(0, 0, BOARD_WIDTH * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE)
       .fill({ color: 0x000000, alpha: 0.5 });

     const gameOverText = new Text('GAME OVER', {
       fontFamily: 'Arial',
       fontSize: BLOCK_SIZE * 1.5,
       fill: 0xff0000,
     });
     gameOverText.x = (BOARD_WIDTH * BLOCK_SIZE - gameOverText.width) / 2;
     gameOverText.y = (BOARD_HEIGHT * BLOCK_SIZE - gameOverText.height) / 3;
     gameContainer.addChild(gameOverText);

     const scoreText = new Text(`Score: ${get(scoreStore)}`, {
       fontFamily: 'Arial',
       fontSize: BLOCK_SIZE,
       fill: 0xffffff,
     });
     scoreText.x = (BOARD_WIDTH * BLOCK_SIZE - scoreText.width) / 2;
     scoreText.y = gameOverText.y + gameOverText.height + BLOCK_SIZE;
     gameContainer.addChild(scoreText);

     const restartText = new Text('Press R to restart', {
       fontFamily: 'Arial',
       fontSize: BLOCK_SIZE * 0.75,
       fill: 0xffffff,
     });
     restartText.x = (BOARD_WIDTH * BLOCK_SIZE - restartText.width) / 2;
     restartText.y = scoreText.y + scoreText.height + BLOCK_SIZE;
     gameContainer.addChild(restartText);
   }
 }

 function restart() {
   boardStore.set(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)));
   scoreStore.set(0);
   levelStore.set(1);
   linesStore.set(0);
   isGameOverStore.set(false);
   isPausedStore.set(false);
   dropInterval.set(1000);
   currentPiece = randomTetromino();
   timeSinceLastDrop.set(0);
   lastRender = Date.now();
   render();
 }

 function moveDown() {
   if (!collision(get(boardStore), currentPiece, 0, 1)) {
     currentPiece.y++;
     return true;
   }
   
   merge(get(boardStore), currentPiece);
   const linesCleared = checkLineClear(get(boardStore));
   if (linesCleared > 0) {
     updateScore(linesCleared);
   }
   
   currentPiece = randomTetromino();
   if (collision(get(boardStore), currentPiece, 0, 0)) {
     isGameOverStore.set(true);
   }
   return false;
 }

 function rotatePiece(piece: Piece, board: number[][]): boolean {
   const rotated = piece.shape[0].map((_, i) =>
     piece.shape.map(row => row[i]).reverse()
   );
   
   const previousShape = piece.shape;
   piece.shape = rotated;
   
   if (collision(board, piece, 0, 0)) {
     piece.shape = previousShape;
     return false;
   }
   
   return true;
 }

 function moveSideways(direction: -1 | 1) {
   if (!collision(get(boardStore), currentPiece, direction, 0)) {
     currentPiece.x += direction;
   }
 }

 function hardDrop() {
   while (moveDown()) { }
 }

 const handleKeyDown = (e: KeyboardEvent) => {
   if (e.code === 'KeyR') {
     e.preventDefault();
     restart();
     return;
   }

   if (e.code === 'Escape') {
     e.preventDefault();
     togglePause();
     return;
   }

   if (get(isPausedStore) || get(isGameOverStore)) return;

   const keyHandlers = {
    ArrowLeft: () => moveSideways(-1),
    ArrowRight: () => moveSideways(1),
    ArrowDown: () => moveDown(),
    ArrowUp: () => rotatePiece(currentPiece, get(boardStore)),
    Space: () => hardDrop(),
  };

  if (keyHandlers[e.code as keyof typeof keyHandlers]) {
    e.preventDefault();
    keyHandlers[e.code as keyof typeof keyHandlers]();
    render();
  }
};

// Game loop
app.ticker.add(() => {
  if (get(isPausedStore) || get(isGameOverStore)) return;

  const now = Date.now();
  const deltaTime = now - lastRender;
  lastRender = now;

  timeSinceLastDrop.update(time => time + deltaTime);
  
  if (get(timeSinceLastDrop) >= get(dropInterval)) {
    moveDown();
    timeSinceLastDrop.set(0);
  }
  
  render();
});

// Setup event listeners
window.addEventListener('keydown', handleKeyDown);

// Create game interface
const game: TetrisGame = {
  start() {
    restart();
  },

  destroy() {
    window.removeEventListener('keydown', handleKeyDown);
    app.destroy();
  },

  resume() {
    if (get(isPausedStore)) {
      togglePause();
    }
  },

  get score() {
    return get(scoreStore);
  },

  get level() {
    return get(levelStore);
  },

  get lines() {
    return get(linesStore);
  },

  get isGameOver() {
    return get(isGameOverStore);
  },

  get isPaused() {
    return get(isPausedStore);
  }
};

// Handle window resize
window.addEventListener('resize', () => {
  const newDimensions = calculateGameDimensions();
  app.renderer.resize(newDimensions.width, newDimensions.height);
  BLOCK_SIZE = newDimensions.blockSize;
  render();
});

return game;
}