// Three.js scene variables
let scene = null;
let renderer = null;
let camera = null;
let collidableObjects = [];

// Constant configurations
const PHYSICS_CONFIG = {
    collisionDistance: 1.0,
    avatarRadius: 0.5,
    avatarHeight: 2.0
};

// Asset configurations
const AVATAR_ASSETS = {
    'male1': 'assets/avatars/male1.svg',
    'female1': 'assets/avatars/female1.svg',
    'male2': 'assets/avatars/male2.svg',
    'female2': 'assets/avatars/female2.svg'
};

// Application state management
const AppState = {
    // 3D Environment
    scene: null,
    camera: null,
    renderer: null,
    
    // User state
    avatar: null,
    currentRoom: null,
    
    // UI state
    isLoading: false, // Loading disabled
    initialized: false,
    
    // Selection state
    selectedRoom: null,
    selectedAvatar: null,
    
    // Camera settings
    cameraMode: 'third-person',
    cameraControls: {
        distance: 8,
        height: 3,
        angle: 0
    },
    
    // Animation state
    isMoving: false,
    mouseSensitivity: 0.002,
    isPointerLocked: false,
    
    // Initialize the application
    init() {
        this.bindEvents();
        this.initialized = false;
        console.log('[DEBUG] AppState initialized');
    },
    
    // Event binding
    bindEvents() {
        // Bind UI event handlers
        const enterRoomBtn = document.getElementById('enter-room-btn');
        if (enterRoomBtn) {
            enterRoomBtn.addEventListener('click', () => enterRoom());
        }
        
        const exitRoomBtn = document.getElementById('exit-room');
        if (exitRoomBtn) {
            exitRoomBtn.addEventListener('click', () => exitRoom());
        }
        
        // Window events
        window.addEventListener('resize', () => {
            if (this.camera && this.renderer) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        console.log('[DEBUG] Events bound');
    }
};

// 3D Environment Setup
async function setup3DEnvironment() {
    console.log('[DEBUG] Setting up 3D environment');
    
    try {
        // Create scene
        AppState.scene = new THREE.Scene();
        AppState.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
        
        // Setup camera
        AppState.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        AppState.camera.position.set(0, 2, 5);
        
        // Setup renderer
        const canvas = document.getElementById('three-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        AppState.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        AppState.renderer.setSize(window.innerWidth, window.innerHeight);
        AppState.renderer.setPixelRatio(window.devicePixelRatio);
        AppState.renderer.shadowMap.enabled = true;
        AppState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        AppState.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        AppState.scene.add(directionalLight);

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.8,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        AppState.scene.add(floor);

        // Load GLB environment for the selected room
        await loadRoomEnvironment();

        // Create avatar
        createSimpleAvatar();

        // Set initialization flag
        AppState.initialized = true;
        
        console.log('[DEBUG] 3D environment setup complete');
        return true;
    } catch (error) {
        console.error('[ERROR] Failed to setup 3D environment:', error);
        return false;
    }
}

// Load GLB room environment based on selected room
async function loadRoomEnvironment() {
    const roomFiles = {
        'mentor-room': 'assets/environments/mentor-room.glb',
        'career-hall': 'assets/environments/career-hall.glb',
        'innovation-lab': 'assets/environments/innovation-lab.glb'
    };

    const roomFile = roomFiles[AppState.selectedRoom];
    
    if (!roomFile) {
        console.warn('[DEBUG] No GLB file defined for room:', AppState.selectedRoom);
        createFallbackRoom();
        return;
    }

    console.log('[DEBUG] Loading GLB environment:', roomFile);
    
    try {
        // Use GLTFLoader to load the environment
        const loader = new THREE.GLTFLoader();
        
        const gltf = await new Promise((resolve, reject) => {
            loader.load(
                roomFile,
                (gltf) => resolve(gltf),
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100);
                    console.log('[DEBUG] Loading progress:', percent + '%');
                },
                (error) => reject(error)
            );
        });

        // Add the loaded model to the scene
        const roomModel = gltf.scene;
        roomModel.scale.setScalar(1); // Adjust scale if needed
        roomModel.position.set(0, 0, 0);
        
        // Enable shadows on all meshes
        roomModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Store collision objects
                if (child.name.toLowerCase().includes('collision') || 
                    child.name.toLowerCase().includes('wall') ||
                    child.name.toLowerCase().includes('furniture')) {
                    physics.collidableObjects.push(child);
                }
            }
        });

        AppState.scene.add(roomModel);
        console.log('[DEBUG] GLB environment loaded successfully:', roomFile);
        
    } catch (error) {
        console.error('[ERROR] Failed to load GLB environment:', error);
        console.log('[DEBUG] Falling back to basic room geometry');
        createFallbackRoom();
    }
}

// Create fallback room when GLB loading fails
function createFallbackRoom() {
    const roomColor = AppState.selectedRoom === 'mentor-room' ? 0x2C3E50 :
                     AppState.selectedRoom === 'innovation-lab' ? 0x8E44AD : 0x27AE60;

    // Create some basic furniture as fallback
    const tableGeometry = new THREE.BoxGeometry(3, 0.1, 1.5);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, 0.75, -2);
    table.castShadow = true;
    table.receiveShadow = true;
    AppState.scene.add(table);

    // Add chairs
    for (let i = 0; i < 4; i++) {
        const chairGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.4);
        const chairMaterial = new THREE.MeshStandardMaterial({ color: roomColor });
        const chair = new THREE.Mesh(chairGeometry, chairMaterial);
        chair.position.set(-1 + i * 0.7, 0.4, -1);
        chair.castShadow = true;
        chair.receiveShadow = true;
        AppState.scene.add(chair);
        physics.collidableObjects.push(chair);
    }
    
    physics.collidableObjects.push(table);
    console.log('[DEBUG] Fallback room created');
}

// Create simple avatar
function createSimpleAvatar() {
    // Create a simple avatar representation
    const avatarGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4444ff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    avatarGroup.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.2);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.4;
    head.castShadow = true;
    avatarGroup.add(head);

    avatarGroup.position.set(0, 0, 2);
    AppState.scene.add(avatarGroup);
    AppState.avatar = avatarGroup;

    console.log('[DEBUG] Simple avatar created');
}

// Loading screen management (disabled)
function showLoadingScreen(message = 'Loading...') {
    // Loading screen disabled
}

function hideLoadingScreen() {
    // Loading screen disabled
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] Initializing application...');
    
    // Initialize application state
    AppState.init();
    
    // Set up initial UI state
    const elements = {
        dashboard: document.getElementById('dashboard'),
        avatarModal: document.getElementById('avatar-modal'),
        gameContainer: document.getElementById('game-container'),
        loadingScreen: document.getElementById('loading-screen'),
        enterRoomBtn: document.getElementById('enter-room-btn')
    };
    
    // Show dashboard, hide other elements
    if (elements.dashboard) {
        elements.dashboard.style.display = 'block';
    }
    
    // Hide modals and game container
    [elements.avatarModal, elements.gameContainer, elements.loadingScreen].forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Add event listener for enter room button
    if (elements.enterRoomBtn) {
        elements.enterRoomBtn.addEventListener('click', function() {
            enterRoom();
        });
        console.log('[DEBUG] Enter room button event listener added');
    }
    
    // Initialize global functions
    window.selectRoom = selectRoom;
    window.closeAvatarModal = closeAvatarModal;
    window.selectPreset = selectPreset;
    
    console.log('[DEBUG] Application initialized');
});

// Error handling
function handleError(error, context) {
    log(context, error, 'error');
    showErrorNotification(error.message || 'An error occurred');
}

function showErrorNotification(message) {
    console.log('[DEBUG] Showing error notification:', message);
    
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize error handlers
window.addEventListener('error', (event) => {
    handleError(event.error, 'Uncaught error');
});

window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'Unhandled promise rejection');
});

// Room selection handler
function selectRoom(roomId) {
    console.log('[DEBUG] Selecting room:', roomId);
    
    try {
        if (!roomId) {
            throw new Error('Invalid room ID');
        }
        
        // Store selected room in localStorage to persist it
        localStorage.setItem('selectedRoom', roomId);
        
        // Update application state
        AppState.selectedRoom = roomId;
        AppState.currentRoom = roomId;
        
        // Get UI elements
        const elements = {
            dashboard: document.getElementById('dashboard'),
            avatarModal: document.getElementById('avatar-modal'),
            roomName: document.getElementById('current-room-name')
        };
        
        // Show avatar selection modal
        if (elements.avatarModal) {
            elements.avatarModal.style.display = 'flex';
            // Ensure it's in front
            elements.avatarModal.style.zIndex = '1000';
        } else {
            throw new Error('Avatar modal not found');
        }
        
        // Update room name if element exists
        if (elements.roomName) {
            elements.roomName.textContent = roomId.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        
        // Reset enter button state
        if (elements.enterRoomBtn) {
            elements.enterRoomBtn.disabled = true;
        }
        
        // Update room name display
        if (elements.roomName) {
            elements.roomName.textContent = roomId.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        console.log('[DEBUG] Room selected successfully:', roomId);
    } catch (error) {
        console.error('[ERROR] Failed to select room:', error);
        showErrorNotification('Failed to select room. Please try again.');
    }
}

// Animation and physics variables
const animations = {
    mixer: null,
    walk: null,
    idle: null
};

// Input state
const inputState = {
    keys: {},
    mouseX: 0,
    mouseY: 0
};

// Communication state
const communicationState = {
    mediaStream: null,
    peerConnection: null,
    isMicMuted: false,
    isScreenSharing: false,
    chatMessages: []
};

// Physics and collision detection state
const physics = {
    collidableObjects: [],
    raycaster: new THREE.Raycaster()
};

// Avatar selection function
function selectPreset(presetId) {
    console.log('[DEBUG] Selecting preset avatar:', presetId);
    
    try {
        // Validate preset
        if (!presetId || !AVATAR_ASSETS[presetId]) {
            throw new Error('Invalid avatar preset');
        }
        
        // Update selected avatar
        AppState.selectedAvatar = {
            type: 'preset',
            id: presetId,
            url: AVATAR_ASSETS[presetId]
        };
        
        // Update UI
        const enterRoomBtn = document.getElementById('enter-room-btn');
        const presets = document.querySelectorAll('.avatar-preset');
        
        // Update selection visuals
        presets.forEach(preset => {
            preset.classList.toggle('selected', preset.getAttribute('data-preset') === presetId);
        });
        
        // Enable enter button and set handler
        if (enterRoomBtn) {
            enterRoomBtn.disabled = false;
            console.log('[DEBUG] Enabled enter room button');
        }
        
        console.log('[DEBUG] Avatar selected successfully:', presetId);
    } catch (error) {
        console.error('[ERROR] Failed to select avatar:', error);
        showErrorNotification('Failed to select avatar. Please try again.');
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update avatar position based on input
    updateAvatarPosition();
    
    // Render the scene
    if (AppState.renderer && AppState.scene && AppState.camera) {
        AppState.renderer.render(AppState.scene, AppState.camera);
    }
}

// Input handlers
function onKeyDown(event) {
    inputState.keys[event.code] = true;
}

function onKeyUp(event) {
    inputState.keys[event.code] = false;
}

function onMouseMove(event) {
    if (AppState.isPointerLocked) {
        inputState.mouseX = event.movementX || 0;
        inputState.mouseY = event.movementY || 0;
    } else {
        inputState.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        inputState.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}

// Update avatar position
function updateAvatarPosition() {
    if (!AppState.avatar) return;
    
    const moveSpeed = 0.1;
    
    if (inputState.keys['KeyW']) AppState.avatar.position.z -= moveSpeed;
    if (inputState.keys['KeyS']) AppState.avatar.position.z += moveSpeed;
    if (inputState.keys['KeyA']) AppState.avatar.position.x -= moveSpeed;
    if (inputState.keys['KeyD']) AppState.avatar.position.x += moveSpeed;
    
    // Update camera to follow avatar
    if (AppState.camera) {
        AppState.camera.position.x = AppState.avatar.position.x;
        AppState.camera.position.z = AppState.avatar.position.z + 5;
        AppState.camera.lookAt(AppState.avatar.position);
    }
}

// Room functions
function exitRoom() {
    // Reset state
    AppState.currentRoom = null;
    AppState.avatar = null;
    AppState.initialized = false;
    
    // Show dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
    }
    
    // Hide game container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
}

function closeAvatarModal() {
    // Hide avatar modal
    const avatarModal = document.getElementById('avatar-modal');
    if (avatarModal) {
        avatarModal.style.display = 'none';
    }
    
    // Show dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
    }
    
    // Reset state
    AppState.selectedAvatar = null;
}

function enterRoom() {
    console.log('[DEBUG] Attempting to enter room');
    
    try {
        if (!AppState.selectedRoom) {
            throw new Error('No room selected');
        }
        
        if (!AppState.selectedAvatar) {
            throw new Error('No avatar selected');
        }
        
        // Hide modal and show loading screen
        const avatarModal = document.getElementById('avatar-modal');
        const loadingScreen = document.getElementById('loading-screen');
        const gameContainer = document.getElementById('game-container');
        
        if (avatarModal) avatarModal.style.display = 'none';
        if (loadingScreen) loadingScreen.style.display = 'block';
        if (gameContainer) gameContainer.style.display = 'block';
        
        // Initialize 3D environment
        setup3DEnvironment().then(() => {
            // Hide loading screen and start animation
            if (loadingScreen) loadingScreen.style.display = 'none';
            animate();
            console.log('[DEBUG] Room entry complete');
        }).catch(error => {
            console.error('[ERROR] Failed to enter room:', error);
            showErrorNotification('Failed to enter room. Please try again.');
            
            // Reset UI state
            if (avatarModal) avatarModal.style.display = 'block';
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'none';
        });
    } catch (error) {
        console.error('[ERROR] Failed to enter room:', error);
        showErrorNotification(error.message);
    }
}

// Debug logging function
function log(context, message, type = 'info') {
    if (!window.DEBUG) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}] [${context}]`;
    
    switch (type) {
        case 'error':
            console.error(prefix, message);
            break;
        case 'warn':
            console.warn(prefix, message);
            break;
        case 'debug':
            console.debug(prefix, message);
            break;
        default:
            console.log(prefix, message);
    }
}