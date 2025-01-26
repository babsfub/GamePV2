<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as PIXI from 'pixi.js';

  let app: PIXI.Application;
  let gameContainer: HTMLDivElement;

  let snake: PIXI.Graphics[] = [];
  let food: PIXI.Graphics;
  let direction = { x: 1, y: 0 };
  const gridSize = 20;
  const tileCount = 20;
  const speed = 100; // in milliseconds
  let score = 0;
  let gameOver = false;

  function initGame() {
    // Reset game state
    snake = [];
    direction = { x: 1, y: 0 };
    score = 0;
    gameOver = false;

    // Clear the stage
    app.stage.removeChildren();

    // Create the snake's head
    const head = new PIXI.Graphics();
    head.beginFill(0x10b981); // Green color
    head.drawRect(0, 0, gridSize, gridSize);
    head.endFill();
    head.x = gridSize * Math.floor(tileCount / 2);
    head.y = gridSize * Math.floor(tileCount / 2);
    snake.push(head);
    app.stage.addChild(head);

    // Place initial food
    placeFood();

    // Start the game loop
    gameLoop();
  }

  function placeFood() {
    if (food) app.stage.removeChild(food);

    food = new PIXI.Graphics();
    food.beginFill(0xef4444); // Red color for food
    food.drawRect(0, 0, gridSize, gridSize);
    food.endFill();
    food.x = Math.floor(Math.random() * tileCount) * gridSize;
    food.y = Math.floor(Math.random() * tileCount) * gridSize;

    app.stage.addChild(food);
  }

  function gameLoop() {
    if (gameOver) return;

    setTimeout(() => {
      updateSnake();
      checkCollisions();
      renderSnake();

      if (!gameOver) gameLoop();
    }, speed);
  }

  function updateSnake() {
    // Calculate new head position
    const newHeadX = snake[0].x + direction.x * gridSize;
    const newHeadY = snake[0].y + direction.y * gridSize;

    // Create a new head segment
    const newHead = new PIXI.Graphics();
    newHead.beginFill(0x10b981); // Green color
    newHead.drawRect(0, 0, gridSize, gridSize);
    newHead.endFill();
    newHead.x = newHeadX;
    newHead.y = newHeadY;
    
    snake.unshift(newHead);

    // Check if the snake eats the food
    if (newHead.x === food.x && newHead.y === food.y) {
      score++;
      placeFood(); // Generate a new piece of food
    } else {
      // Remove the tail segment if no food is eaten
      const tail = snake.pop();
      if (tail) {
        app.stage.removeChild(tail);
      }
    }

    app.stage.addChild(newHead);
  }

  function checkCollisions() {
    const head = snake[0];

    // Check collision with walls
    if (
      head.x < 0 ||
      head.x >= tileCount * gridSize ||
      head.y < 0 ||
      head.y >= tileCount * gridSize
    ) {
      handleGameOver();
      return;
    }

    // Check collision with itself
    for (let i = 1; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        handleGameOver();
        return;
      }
    }
  }

  function renderSnake() {
    snake.forEach(segment => app.stage.addChild(segment));
  }

  function handleGameOver() {
    gameOver = true;

    alert(`Game Over! Final Score: ${score}`);

    // Restart the game after a delay
    setTimeout(initGame, speed * 5);
  }

  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
        if (direction.y !== 1) direction = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
        if (direction.y !== -1) direction = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
        if (direction.x !== 1) direction = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
        if (direction.x !== -1) direction = { x: 1, y: 0 };
        break;
      default:
        break;
    }
  }

  onMount(() => {
    app = new PIXI.Application({
      width: tileCount * gridSize,
      height: tileCount * gridSize,
      backgroundColor: 0x0f172a,
      resolution: window.devicePixelRatio || 1,
      antialias: true,
    });

    gameContainer.appendChild(app.view);

    initGame();

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      app.destroy(true); // Clean up PixiJS application
    };
  });
</script>

<div bind:this={gameContainer} class="game-container"></div>

<style>
.game-container {
  margin: auto;
}
</style>
