'use strict';

class Snake {
    constructor(brain) {
        if (brain instanceof NeuralNetwork) {
            this.brain = brain.copy();
            this.brain.mutate(mutate);
        } else {
            this.brain = new NeuralNetwork(12, 12, 4);
        }

        this.position = [centerCellX, centerCellY];
        this.direction = UP; // only the defined constants are allowed

        this.isActive = true;
        this.score = 1; // to prevent division by zero in game
        this.fitness = 0;
        this.moves = 0;

        this.tail = new Queue();

        this.edible = [0, 0];
        this.newEdible();
        this.distanceToEdible = this.calculateDistanceToEdible();
    }

    newEdible() {
        if (this.tail.length >= totalCellsMinusOne) {
            assign(this.edible, this.position);
        } else {
            do {
                this.edible[0] = Math.floor(Math.random() * widthCells);
                this.edible[1] = Math.floor(Math.random() * heightCells);
            } while (this.collidesWithTail(this.edible) || equal(this.edible, this.position));
        }
    }

    calculateDistanceToEdible() {
        return Math.abs(this.position[0] - this.edible[0]) +
            Math.abs(this.position[1] - this.edible[1]);
    }

    buffer() {
        addColor(buffer[this.position[1]][this.position[0]], HEAD_COLOR);

        for (let node of this.tail) {
            addColor(buffer[node[1]][node[0]], TAIL_COLOR);
        }

        addColor(buffer[this.edible[1]][this.edible[0]], EDIBLE_COLOR);
    }

    think() {
        const distances = this.calculateDistances();
        const inputs = [
            map(this.position[0], 0, widthCellsMinusOne),
            map(this.position[1], 0, heightCellsMinusOne),
            map(this.edible[0] - this.position[0], -widthCellsMinusOne, widthCellsMinusOne),
            map(this.edible[1] - this.position[1], -heightCellsMinusOne, heightCellsMinusOne),
            ...distances
        ];
        const action = this.brain.predict(inputs);
        const max = Math.max(...action);

        if (max === action[0]) {
            this.changeDirection(LEFT);
        } else if (max === action[1]) {
            this.changeDirection(UP);
        } else if (max === action[2]) {
            this.changeDirection(RIGHT);
        } else {
            this.changeDirection(DOWN);
        }
    }

    calculateDistances() {
        return [
            this.checkDist(DOWN_LEFT),
            this.checkDist(LEFT),
            this.checkDist(LEFT_UP),
            this.checkDist(UP),
            this.checkDist(UP_RIGHT),
            this.checkDist(RIGHT),
            this.checkDist(RIGHT_DOWN),
            this.checkDist(DOWN)
        ];
    }

    checkDist(dir) {
        if (SIMPLE) {
            const position = add(this.position, dir);

            if (this.isOutOfBounds(position) || this.collidesWithTail(position)) {
                return 1;
            }

            if (this.collidesWithEdible(position)) {
                return 0;
            }

            return 0.5;
        }

        let position = add(this.position, dir);
        let distance = 1;

        while (!this.isOutOfBounds(position) && !this.collidesWithTail(position)) {
            if (++distance === VISION_RAY_LENGTH) {
                break;
            }

            addAssign(position, dir);
        }

        return map(distance, 1, VISION_RAY_LENGTH);
    }

    calculate() {
        this.move();
        this.checkCollision();
        // console.log(this.calculateDistances());
    }

    move() {
        addAssign(this.position, this.direction);
        this.moves++;
    }

    checkCollision() {
        if (this.collidesWithEdible(this.position)) {
            this.moves = 0;
            this.score += edibleIncrement;
            this.addNode();
            this.newEdible();
            this.distanceToEdible = this.calculateDistanceToEdible();
            return;
        }

        if (
            this.moves > totalCellsMinusOne ||
            this.isOutOfBounds(this.position) ||
            this.collidesWithTail(this.position)
        ) {
            this.isActive = false;
            return;
        }

        this.shiftNodes();

        const newDist = this.calculateDistanceToEdible();

        if (newDist < this.distanceToEdible) {
            this.score++;
            this.distanceToEdible = newDist;
        }
    }

    isOutOfBounds(pos) {
        return pos[0] < 0 || pos[0] >= widthCells ||
            pos[1] < 0 || pos[1] >= heightCells;
    }

    collidesWithTail(pos) {
        for (let node of this.tail) {
            if (equal(node, pos)) {
                return true;
            }
        }

        return false;
    }

    collidesWithEdible(pos) {
        return equal(this.edible, pos);
    }

    addNode() {
        this.tail.enqueue(subtract(this.position, this.direction));
    }

    shiftNodes() {
        if (!this.tail.isEmpty()) {
            this.tail.shift();
            this.addNode();
        }
    }

    // only pass the defined constants
    changeDirection(dir) {
        if (!this.isBackward(dir)) {
            this.direction = dir;
        }
    }

    isBackward(dir) {
        const node = this.tail.peekLast();

        if (node === null) {
            return false;
        }

        return equal(node, add(this.position, dir));
    }

    left() {
        switch (this.direction) {
            case UP:
                this.direction = LEFT;
                break;
            case RIGHT:
                this.direction = UP;
                break;
            case DOWN:
                this.direction = RIGHT;
                break;
            case LEFT:
                this.direction = DOWN;
                break;
        }
    }

    right() {
        switch (this.direction) {
            case UP:
                this.direction = RIGHT;
                break;
            case RIGHT:
                this.direction = DOWN;
                break;
            case DOWN:
                this.direction = LEFT;
                break;
            case LEFT:
                this.direction = UP;
                break;
        }
    }

    mutate() {
        return new Snake(this.brain);
    }
}

function mutate(x) {
    if (Math.random() < 0.1) {
        return x + randomGaussian() * 0.5;
    }

    return x;
}

function randomGaussian() {
    let u = 0;
    let v = 0;

    while (u === 0) {
        u = Math.random();
    }

    while (v === 0) {
        v = Math.random();
    }

    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(TWOPI * v);
}

function map(value, min, max) {
    return (value - min) / (max - min);
}

function addAssign(a, b) {
    a[0] += b[0];
    a[1] += b[1];
}

function add(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}

function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
}

function assign(a, b) {
    a[0] = b[0];
    a[1] = b[1];
}

function equal(a, b) {
    return a[0] === b[0] && a[1] === b[1];
}

function drawBuffer() {
    for (let y = 0; y < heightCells; y++) {
        const row = buffer[y];

        for (let x = 0; x < widthCells; x++) {
            const cell = row[x];

            ctx.fillStyle = colorToText(cell);
            fillCell(x, y);
        }
    }
}

function fillCell(x, y) {
    ctx.fillRect(
        x * PIXELS_PER_CELL + DRAW_MARGIN,
        y * PIXELS_PER_CELL + DRAW_MARGIN,
        CELL_SIZE,
        CELL_SIZE
    );
}

function addColor(cell, color) {
    cell.r = Math.min(Math.floor(cell.r * 0.8 + color.r), 255);
    cell.g = Math.min(Math.floor(cell.g * 0.8 + color.g), 255);
    cell.b = Math.min(Math.floor(cell.b * 0.8 + color.b), 255);
}
