'use strict';

setTPS();
setFPS();
setSnakesPerGeneration();
initBuffer();
reset();

tpsSlider.oninput = setTPS;
fpsSlider.oninput = setFPS;
document.addEventListener('keydown', event => {
    switch (event.key) {
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

    if (frameID !== 0) event.preventDefault();
});

canvas.addEventListener('click', () => pauseUnpause());

resetButton.addEventListener('click', () => reset());

sampleJSONButton.addEventListener('click', () => {
    inputJSON.value = SAMPLE_JSON;
});

bestJSONButton.addEventListener('click', () => {
    inputJSON.value = (bestSnake) ? bestSnake.brain.serialize() : 'No best snake yet.';
});

loadJSONButton.addEventListener('click', () => {
    try {
        allSnakes[0].brain = NeuralNetwork.deserialize(inputJSON.value);
    } catch(e) {
        inputJSON.value = "Couldn't load JSON: " + e.message;
        return;
    }
    inputJSON.value = 'JSON loaded into the first snake.';
});

function reset() {
    highestScore = 0;
    highestSpan.innerHTML = highestScore;

    generation = 1;
    generationSpan.innerHTML = generation;

    if (frameID !== 0) {
        pause();
    }

    drawPauseScreen();
    setSnakesPerGeneration();
    resetSnakes();
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

function setSnakesPerGeneration() {
    let spg = snakesInput.value;

    if (spg > snakesInput.max) {
        spg = snakesInput.max;
        snakesInput.value = spg;
    } else if (spg < snakesInput.min) {
        spg = snakesInput.min;
        snakesInput.value = spg;
    }

    snakesPerGeneration = parseInt(spg);
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

function resetSnakes() {
    allSnakes = [];

    for (let i = 0; i < snakesPerGeneration; i++) {
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

    for (let i = 0; i < snakesPerGeneration; i++) {
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
    if (frameID === 0) {
        unpause();
    } else {
        pause();
        drawPauseText();
    }
}

function unpause() {
    ctx.font = INFO_FONT;
    ctx.textAlign = INFO_FONT_ALIGN;
    ctx.textBaseline = INFO_FONT_BASELINE;

    frameID = setTimeout(draw, 0);
    tickID = setTimeout(calculate, timePerTick);
}

function pause() {
    clearTimeout(tickID);
    tickID = 0;

    clearTimeout(frameID);
    frameID = 0;
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
