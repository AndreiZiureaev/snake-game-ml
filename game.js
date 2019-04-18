'use strict';

// Game variables
const SNAKES_PER_GENERATION = 1000;
const PIXELS_PER_CELL = 30;

const BACKGROUND_COLOR_OBJECT = { r: 0, g: 0, b: 0 };
const BACKGROUND_COLOR = colorToText(BACKGROUND_COLOR_OBJECT);

const TEXT_COLOR_OBJECT = { r: 239, g: 239, b: 239 };
const TEXT_COLOR = colorToText(TEXT_COLOR_OBJECT);

const PAUSED_FONT_SIZE = 15;
const PAUSED_FONT = `bold ${PAUSED_FONT_SIZE}px sans-serif`;
const PAUSED_FONT_ALIGN = 'center';
const PAUSED_FONT_BASELINE = 'middle';

const PAUSED_TEXT = 'Press Space to resume/pause';
const FPS_TEXT = 'FPS: ';
const TPS_TEXT = 'TPS: ';
const AI_ON_TEXT = 'AI: on';
const AI_OFF_TEXT = 'AI: off';

const INFO_FONT_SIZE = 11;
const INFO_FONT = `${INFO_FONT_SIZE}px sans-serif`;
const INFO_FONT_MARGIN = 2;
const INFO_FONT_ALIGN = 'left';
const INFO_FONT_BASELINE = 'top';

const canvas = document.getElementById('canvas');
const ctx = this.canvas.getContext('2d', {
    alpha: false
});
const tpsSlider = document.getElementById('tps');
const tpsSpan = document.getElementById('tpsSpan');
const fpsSlider = document.getElementById('fps');
const fpsSpan = document.getElementById('fpsSpan');
const generationSpan = document.getElementById('generation');
const highestSpan = document.getElementById('highest');


const widthPx = canvas.width;
const heightPx = canvas.height;
const centerPxX = Math.floor(widthPx / 2);
const centerPxY = Math.floor(heightPx / 2);

const widthCells = Math.floor(widthPx / PIXELS_PER_CELL);
const heightCells = Math.floor(heightPx / PIXELS_PER_CELL);
const centerCellX = Math.floor(widthCells / 2);
const centerCellY = Math.floor(heightCells / 2);
const totalCellsMinusOne = widthCells * heightCells - 1;
const maxDist = Math.max(widthCells, heightCells);
const widthCellsMinusOne = widthCells - 1;
const heightCellsMinusOne = heightCells - 1;

let frameTimestamp = 0;
let tickTimestamp = 0;
let actualTPS = 0;
let frameID = 0;
let tickID = 0;
let generation = 1;
let highestScore = 0;
let bestSnake;
let AI = true;
let timePerTick;
let timePerFrame;

const buffer = [];

let allSnakes = [];
const activeSnakes = function* () {
    for (let snake of allSnakes) {
        if (snake.isActive) {
            yield snake;
        }
    }
};

// Snake variables
const TWOPI = Math.PI * 2;

const UP = [0, -1];
const UP_RIGHT = [1, -1];
const RIGHT = [1, 0];
const RIGHT_DOWN = [1, 1];
const DOWN = [0, 1];
const DOWN_LEFT = [-1, 1];
const LEFT = [-1, 0];
const LEFT_UP = [-1, -1];

const SIMPLE = true;
const VISION_RAY_LENGTH = 3;

const HEAD_COLOR = { r: 10, g: 255, b: 10 };
const TAIL_COLOR = { r: 10, g: 255, b: 150 };
const EDIBLE_COLOR = { r: 255, g: 10, b: 150 };

const DRAW_MARGIN = Math.floor(PIXELS_PER_CELL * 0.1);
const CELL_SIZE = PIXELS_PER_CELL - DRAW_MARGIN * 2;

const edibleIncrement = widthCells + heightCells;

// Set state and listen for user actions
setTPS();
setFPS();
initBuffer();
addSnakes();
drawPauseScreen();

tpsSlider.oninput = setTPS;
fpsSlider.oninput = setFPS;
document.addEventListener('keydown', event => {
    switch (event.key) {
        case ' ':
            pauseUnpause();
            break;
        case 'ArrowUp':
            changeDirection(UP);
            break;
        case 'ArrowRight':
            changeDirection(RIGHT);
            break;
        case 'ArrowDown':
            changeDirection(DOWN);
            break;
        case 'ArrowLeft':
            changeDirection(LEFT);
            break;
        case 'a':
            left();
            break;
        case 'd':
            right();
            break;
        case 'Enter':
            AI = !AI;
            break;
        default:
            return;
    }
    event.preventDefault();
});

function colorToText(col) {
    return `rgb(${col.r},${col.g},${col.b})`;
}

function setTPS() {
    const value = tpsSlider.value ** 2;
    tpsSpan.innerHTML = value;
    timePerTick = Math.floor(1000 / value);
}

function setFPS() {
    const value = fpsSlider.value;
    fpsSpan.innerHTML = value;
    timePerFrame = Math.floor(1000 / value);
}

function initBuffer() {
    for (let row = 0; row < heightCells; row++) {
        buffer.push([]);

        for (let col = 0; col < widthCells; col++) {
            buffer[row].push({ r: 0, g: 0, b: 0 });
        }
    }
}

function resetBuffer() {
    for (let row of buffer) {
        for (let cell of row) {
            Object.assign(cell, BACKGROUND_COLOR_OBJECT);
        }
    }
}

function addSnakes() {
    for (let i = 0; i < SNAKES_PER_GENERATION; i++) {
        allSnakes.push(new Snake());
    }
}

function changeDirection(dir) {
    if (frameID !== 0 && !AI) {
        for (let snake of activeSnakes()) {
            snake.changeDirection(dir);
        }
    }
}

function left() {
    if (frameID !== 0 && !AI) {
        for (let snake of activeSnakes()) {
            snake.left();
        }
    }
}

function right() {
    if (frameID !== 0 && !AI) {
        for (let snake of activeSnakes()) {
            snake.right();
        }
    }
}

function draw() {
    const start = performance.now();
    const FPS = 1000 / (start - frameTimestamp);
    frameTimestamp = start;

    resetBuffer();

    for (let snake of activeSnakes()) {
        snake.buffer();
    }

    fillBackground();
    drawBuffer();

    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(`${FPS_TEXT}${FPS.toFixed(2)}`, INFO_FONT_MARGIN, INFO_FONT_MARGIN);
    ctx.fillText(`${TPS_TEXT}${actualTPS.toFixed(2)}`, INFO_FONT_MARGIN, INFO_FONT_MARGIN + INFO_FONT_SIZE);
    ctx.fillText(AI ? AI_ON_TEXT : AI_OFF_TEXT, INFO_FONT_MARGIN, INFO_FONT_MARGIN + INFO_FONT_SIZE * 2);

    highestSpan.innerHTML = highestScore;

    const elapsed = performance.now() - start;
    const delay = Math.max(timePerFrame - elapsed, 0);

    frameID = setTimeout(draw, delay);
}

function fillBackground() {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(
        0, 0,
        widthCells * PIXELS_PER_CELL,
        heightCells * PIXELS_PER_CELL
    );
}

function calculate() {
    const start = performance.now();

    actualTPS = 1000 / (start - tickTimestamp);
    tickTimestamp = start;

    for (let snake of activeSnakes()) {
        if (AI) {
            snake.think();
        }

        snake.calculate();

        if (snake.tail.length > highestScore) {
            highestScore = snake.tail.length;
            bestSnake = snake;
        }
    }

    const noActiveSnakes = activeSnakes().next().done === true;

    if (noActiveSnakes) {
        newGeneration();
    }

    const elapsed = performance.now() - start;
    const delay = Math.max(timePerTick - elapsed, 0);

    tickID = setTimeout(calculate, delay);
}

function newGeneration() {
    const newSnakes = [];

    calculateFitness();

    for (let i = 0; i < SNAKES_PER_GENERATION; i++) {
        newSnakes.push(selectSnake());
    }

    allSnakes = newSnakes;

    generation++;
    generationSpan.innerHTML = generation;
}

function calculateFitness() {
    let sum = 0;

    for (let snake of allSnakes) {
        snake.score *= snake.score;
        sum += snake.score;
    }

    for (let snake of allSnakes) {
        snake.fitness = snake.score / sum;
    }
}

function selectSnake() {
    const rand = Math.random();
    let sum = 0;
    let index = 0;

    while (sum < rand && index < allSnakes.length) {
        sum += allSnakes[index++].fitness;
    }

    return allSnakes[index - 1].mutate();
}

function pauseUnpause() {

    // unpause
    if (frameID === 0) {
        ctx.font = INFO_FONT;
        ctx.textAlign = INFO_FONT_ALIGN;
        ctx.textBaseline = INFO_FONT_BASELINE;

        frameID = setTimeout(draw, 0);
        tickID = setTimeout(calculate, timePerTick);

        // pause
    } else {
        clearTimeout(tickID);
        tickID = 0;

        clearTimeout(frameID);
        frameID = 0;

        drawPauseText();
    }
}

function drawPauseScreen() {
    fillBackground();
    drawPauseText();
}

function drawPauseText() {
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = PAUSED_FONT;
    ctx.textAlign = PAUSED_FONT_ALIGN;
    ctx.textBaseline = PAUSED_FONT_BASELINE;
    ctx.fillText(
        PAUSED_TEXT,
        centerPxX,
        centerPxY
    );
}
