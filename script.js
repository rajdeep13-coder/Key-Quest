
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dynamically adjust canvas size to fit the screen
function resizeCanvas() {
    const aspectRatio = 16 / 9; // Original aspect ratio (768 / 576)
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (windowWidth / windowHeight > aspectRatio) {
        canvas.height = windowHeight;
        canvas.width = windowHeight * aspectRatio;
    } else {
        canvas.width = windowWidth;
        canvas.height = windowWidth / aspectRatio;
    }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Function to dynamically calculate tileSize
function getTileSize() {
    return Math.round(canvas.width / 32); // Divide by 16 for zoom-out
}

// Game variables
let keysPressed = {};
let lastTime = 0;
let playTime = 0;

// Player object
let player = {
    x: 0,
    y: 0,
    width: 48,
    height: 48,
    speed: 4,
    direction: 'down',
    hasKey: 0,
    hasBoots: false,
    spriteCounter: 0,
    spriteNum: 1,
    solidArea: { x: 8, y: 16, width: 32, height: 32 },
    // New properties for spell and sword animations
    isCastingSpell: false,
    spellFrame: 1, // Alternates between 1 and 2
    isSwingingSword: false,
    swordFrame: 1, // Alternates between 1 and 2
};

// Load assets
const assets = {
    player: {
        down1: new Image(),
        down2: new Image(),
        up1: new Image(),
        up2: new Image(),
        left1: new Image(),
        left2: new Image(),
        right1: new Image(),
        right2: new Image(),
    },
    tiles: {
        grass: new Image(),
        wall: new Image(),
        water: new Image(),
        earth: new Image(),
        tree: new Image(),
        sand: new Image(),
    },
    objects: {
        key: new Image(),
        door: new Image(),
        boots: new Image(),
        chest: new Image(),
    },
    spells: {
        spell1: new Image(),
        spell2: new Image(),
    },
    swords: {
        sword1: new Image(),
        sword2: new Image(),
    },
};

// Load player images
assets.player.down1.src = 'assets/images/player_down_1.png';
assets.player.down2.src = 'assets/images/player_down_2.png';
assets.player.up1.src = 'assets/images/player_up_1.png';
assets.player.up2.src = 'assets/images/player_up_2.png';
assets.player.left1.src = 'assets/images/player_left_1.png';
assets.player.left2.src = 'assets/images/player_left_2.png';
assets.player.right1.src = 'assets/images/player_right_1.png';
assets.player.right2.src = 'assets/images/player_right_2.png';

// Load tile images
assets.tiles.grass.src = 'assets/images/grass.png';
assets.tiles.wall.src = 'assets/images/wall.png';
assets.tiles.water.src = 'assets/images/water.png';
assets.tiles.earth.src = 'assets/images/earth.png';
assets.tiles.tree.src = 'assets/images/tree.png';
assets.tiles.sand.src = 'assets/images/sand.png';

// Load object images
assets.objects.key.src = 'assets/images/key.png';
assets.objects.door.src = 'assets/images/door.png';
assets.objects.boots.src = 'assets/images/boots.png';
assets.objects.chest.src = 'assets/images/chest.png';

assets.spells.spell1.src = 'assets/images/spell1.png';
assets.spells.spell2.src = 'assets/images/spell2.png';
assets.swords.sword1.src = 'assets/images/sword1.png';
assets.swords.sword2.src = 'assets/images/sword2.png';

// Load sounds
const sounds = {
    background: new Audio('assets/sounds/background.wav'),
    coin: new Audio('assets/sounds/coin.wav'),
    unlock: new Audio('assets/sounds/unlock.wav'),
    powerup: new Audio('assets/sounds/powerup.wav'),
    fanfare: new Audio('assets/sounds/fanfare.wav'),
    spell: new Audio('assets/sounds/spell.wav'),
    sword: new Audio('assets/sounds/sword.wav'),
};

// Load map
let mapData;
async function loadMap(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load map: ${response.statusText}`);
        const text = await response.text();
        return text.split('\n').map(row => row.trim().split(/\s+/).map(Number));
    } catch (error) {
        console.error('Error loading map:', error);
        return null;
    }
}

// Objects array
let objects = [];

// Collision detection
function checkCollision(entity, map, objects) {
    const tileSize = getTileSize();
    let left = Math.floor((entity.x + entity.solidArea.x) / tileSize);
    let right = Math.floor((entity.x + entity.solidArea.x + entity.solidArea.width - 1) / tileSize);
    let top = Math.floor((entity.y + entity.solidArea.y) / tileSize);
    let bottom = Math.floor((entity.y + entity.solidArea.y + entity.solidArea.height - 1) / tileSize);

    switch (entity.direction) {
        case 'up':
            top = Math.floor((entity.y + entity.solidArea.y - entity.speed) / tileSize);
            break;
        case 'down':
            bottom = Math.floor((entity.y + entity.solidArea.y + entity.solidArea.height - 1 + entity.speed) / tileSize);
            break;
        case 'left':
            left = Math.floor((entity.x + entity.solidArea.x - entity.speed) / tileSize);
            break;
        case 'right':
            right = Math.floor((entity.x + entity.solidArea.x + entity.solidArea.width - 1 + entity.speed) / tileSize);
            break;
    }

    // Check for collisions with walls (1), water (2), or trees (4)
    if (
        map[top]?.[left] === 1 || map[top]?.[right] === 1 ||
        map[bottom]?.[left] === 1 || map[bottom]?.[right] === 1 ||
        map[top]?.[left] === 2 || map[top]?.[right] === 2 ||
        map[bottom]?.[left] === 2 || map[bottom]?.[right] === 2 ||
        map[top]?.[left] === 4 || map[top]?.[right] === 4 ||
        map[bottom]?.[left] === 4 || map[bottom]?.[right] === 4
    ) {
        return true; // Collision detected with tiles
    }

    // Check for collisions with objects
    for (let obj of objects) {
        if (
            obj.collision && // Only check objects marked as collisions
            entity.x < obj.x + tileSize &&
            entity.x + tileSize > obj.x &&
            entity.y < obj.y + tileSize &&
            entity.y + tileSize > obj.y
        ) {
            return true; // Collision detected with an object
        }
    }

    return false; // No collision
}

function checkObjectCollision(player, objects) {
    const tileSize = getTileSize();
    for (let obj of objects) {
        if (
            player.x < obj.x + tileSize &&
            player.x + tileSize > obj.x &&
            player.y < obj.y + tileSize &&
            player.y + tileSize > obj.y
        ) {
            return obj;
        }
    }
    return null;
}

// Pick up objects
function pickUpObject(obj) {
    if (!obj) {
        console.warn("Attempted to pick up an invalid object.");
        return;
    }
    console.log("Picked up object:", obj);
    switch (obj.type) {
        case 'key':
            player.hasKey++;
            removeObject(obj);
            obj.collision = true; 
            showMessage("You got a Key!");
            playSound(sounds.coin);
            console.log("Keys after pickup:", player.hasKey); // Debugging line

            // Disable collision for all doors
            objects.forEach(door => {
                if (door.type === 'door') {
                    door.collision = false;
                    console.log("Door collision disabled for:", door);
                }
            });
            break;

        case 'door':
            console.log("Interacting with door. Keys before:", player.hasKey); // Debugging line
            if (player.hasKey > 0) {
                player.hasKey--;
                removeObject(obj);
                showMessage("Door Opened!");
                playSound(sounds.unlock);
                console.log("Door removed. Keys after:", player.hasKey); // Debugging line
            } else {
                showMessage("You need a Key!");
            }
            break;

        case 'boots':
            player.speed += 1;
            player.hasBoots = true;
            removeObject(obj);
            showMessage("Speed Up!");
            playSound(sounds.powerup);
            break;

        case 'chest':
            showMessage("Treasure Found!");
            playSound(sounds.fanfare);
            setTimeout(() => alert("Congratulations! You found the treasure!"), 1000);
            stopMusic();
            break;

        default:
            console.warn("Unknown object type:", obj.type);
    }
}

// Remove object from the game
function removeObject(obj) {
    if (!obj) return;
    console.log("Removing object:", obj);
    objects = objects.filter(o => o !== obj);
}

// Show message on screen
function showMessage(text) {
    const messageElement = document.getElementById('message');
    if (!messageElement) {
        console.error("Message element not found in the DOM.");
        return;
    }
    messageElement.innerText = text;
    setTimeout(() => {
        messageElement.innerText = '';
    }, 2000);
}

// Play sound
function playSound(sound) {
    if (!sound || !sound.play) {
        console.error("Invalid sound object:", sound);
        return;
    }
    try {
        sound.currentTime = 0; // Reset to the start
        sound.play();
    } catch (error) {
        console.error("Error playing sound:", error);
    }
}

// Stop music
function stopMusic() {
    sounds.background.pause();
    sounds.background.currentTime = 0;
}

// Game loop
function gameLoop(timestamp) {
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    render();

    playTime += deltaTime / 1000;
    requestAnimationFrame(gameLoop);
}

// Update game state
function update(deltaTime) {
    let newX = player.x;
    let newY = player.y;
    let isMoving = false;

    // Check for movement keys (both WASD and Arrow Keys)
    if (keysPressed['ArrowUp'] || keysPressed['w']) {
        newY -= player.speed;
        player.direction = 'up';
        isMoving = true;
    }
    if (keysPressed['ArrowDown'] || keysPressed['s']) {
        newY += player.speed;
        player.direction = 'down';
        isMoving = true;
    }
    if (keysPressed['ArrowLeft'] || keysPressed['a']) {
        newX -= player.speed;
        player.direction = 'left';
        isMoving = true;
    }
    if (keysPressed['ArrowRight'] || keysPressed['d']) {
        newX += player.speed;
        player.direction = 'right';
        isMoving = true;
    }

    // Check collision before updating position
    if (!checkCollision({ ...player, x: newX, y: newY }, mapData, objects)) {
        player.x = newX;
        player.y = newY;
    }

    const collidedObject = checkObjectCollision(player, objects);
    console.log("Collided object:", collidedObject); // Debugging line
    pickUpObject(collidedObject);

    // Update sprite animation only if the player is moving
    if (isMoving) {
        player.spriteCounter++;
        if (player.spriteCounter > 10) {
            player.spriteNum = player.spriteNum === 1 ? 2 : 1;
            player.spriteCounter = 0;
        }
    } else {
        player.spriteNum = 1;
    }

    // Update sword animation (e key)
    if (keysPressed['e']) {
        player.isSwingingSword = true;
        player.spriteCounter++;
        if (player.spriteCounter > 10) {
            player.swordFrame = player.swordFrame === 1 ? 2 : 1;
            player.spriteCounter = 0;
            playSound(sounds.sword); // Play sword sound
        }
    } else {
        player.isSwingingSword = false;
    }

    // Update spell animation (q key)
    if (keysPressed['q']) {
        player.isCastingSpell = true;
        player.spriteCounter++;
        if (player.spriteCounter > 10) {
            player.spellFrame = player.spellFrame === 1 ? 2 : 1;
            player.spriteCounter = 0;
            playSound(sounds.spell); // Play spell sound
        }
    } else {
        player.isCastingSpell = false;
    }
}

// Render game objects
function render() {
    const tileSize = getTileSize();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw map
    if (mapData) {
        for (let row = 0; row < mapData.length; row++) {
            for (let col = 0; col < mapData[row].length; col++) {
                let tileNum = mapData[row][col];
                let tileImage;
                switch (tileNum) {
                    case 0: tileImage = assets.tiles.grass; break;
                    case 1: tileImage = assets.tiles.wall; break;
                    case 2: tileImage = assets.tiles.water; break;
                    case 3: tileImage = assets.tiles.earth; break;
                    case 4: tileImage = assets.tiles.tree; break;
                    case 5: tileImage = assets.tiles.sand; break;
                }
                if (tileImage) {
                    ctx.drawImage(tileImage, col * tileSize, row * tileSize, tileSize, tileSize);
                }
            }
        }
    } else {
        console.error("Map data is not loaded!");
    }

    // Draw objects
    objects.forEach(obj => {
        ctx.drawImage(assets.objects[obj.type], obj.x, obj.y, tileSize, tileSize);
    });

    // Draw player
    let playerImage;
    if (player.isCastingSpell) {
        playerImage = player.spellFrame === 1 ? assets.spells.spell1 : assets.spells.spell2;
    } else if (player.isSwingingSword) {
        playerImage = player.swordFrame === 1 ? assets.swords.sword1 : assets.swords.sword2;
    } else {
        switch (player.direction) {
            case 'up': playerImage = player.spriteNum === 1 ? assets.player.up1 : assets.player.up2; break;
            case 'down': playerImage = player.spriteNum === 1 ? assets.player.down1 : assets.player.down2; break;
            case 'left': playerImage = player.spriteNum === 1 ? assets.player.left1 : assets.player.left2; break;
            case 'right': playerImage = player.spriteNum === 1 ? assets.player.right1 : assets.player.right2; break;
        }
    }
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);

    // Update UI
    document.getElementById('key-count').innerText = `Keys: ${player.hasKey}`;
    document.getElementById('time').innerText = `Time: ${playTime.toFixed(2)}`;
}

// Event listeners for key presses
window.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

// Reference to on-screen control buttons
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// Simulate key presses when buttons are pressed
btnUp.addEventListener('touchstart', () => { keysPressed['ArrowUp'] = true; });
btnUp.addEventListener('touchend', () => { keysPressed['ArrowUp'] = false; });

btnDown.addEventListener('touchstart', () => { keysPressed['ArrowDown'] = true; });
btnDown.addEventListener('touchend', () => { keysPressed['ArrowDown'] = false; });

btnLeft.addEventListener('touchstart', () => { keysPressed['ArrowLeft'] = true; });
btnLeft.addEventListener('touchend', () => { keysPressed['ArrowLeft'] = false; });

btnRight.addEventListener('touchstart', () => { keysPressed['ArrowRight'] = true; });
btnRight.addEventListener('touchend', () => { keysPressed['ArrowRight'] = false; });

// Optional: Add mouse click support for desktop users
btnUp.addEventListener('mousedown', () => { keysPressed['ArrowUp'] = true; });
btnUp.addEventListener('mouseup', () => { keysPressed['ArrowUp'] = false; });

btnDown.addEventListener('mousedown', () => { keysPressed['ArrowDown'] = true; });
btnDown.addEventListener('mouseup', () => { keysPressed['ArrowDown'] = false; });

btnLeft.addEventListener('mousedown', () => { keysPressed['ArrowLeft'] = true; });
btnLeft.addEventListener('mouseup', () => { keysPressed['ArrowLeft'] = false; });

btnRight.addEventListener('mousedown', () => { keysPressed['ArrowRight'] = true; });
btnRight.addEventListener('mouseup', () => { keysPressed['ArrowRight'] = false; });

// Initialize game
async function initGame() {
    mapData = await loadMap('assets/maps/world01.txt'); // Ensure this path is correct
    if (!mapData) {
        console.error("Failed to load map data. Check the file path.");
        return;
    }

    // Set initial player position based on tileSize
    const tileSize = getTileSize();
    player.x = tileSize * 11; // Adjust starting position as needed
    player.y = tileSize * 11;
    player.width = tileSize;
    player.height = tileSize;

    // Add objects
    objects.push(
        { type: 'key', x: tileSize * 3, y: tileSize * 11 },
        { type: 'key', x: tileSize * 22, y: tileSize * 15 },
        { type: 'key', x: tileSize * 1, y: tileSize * 1 },
        { type: 'door', x: tileSize * 1, y: tileSize * 8, collision: true },
        { type: 'door', x: tileSize * 9, y: tileSize * 14, collision: true },
        { type: 'door', x: tileSize * 30, y: tileSize * 6, collision: true },
        { type: 'chest', x: tileSize * 12, y: tileSize * 14 },
        { type: 'boots', x: tileSize * 4, y: tileSize * 5 }
    );

    // Start background music
    sounds.background.loop = true;
    sounds.background.play();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

initGame();

