// Global variables
let scene, camera, renderer, avatar, currentRoom = null;
let isMoving = false;
let keys = {};
let mouseX = 0, mouseY = 0;
let avatarMixer = null;
let walkAnimation = null;
let idleAnimation = null;
let mediaStream = null;
let peerConnection = null;
let isMicMuted = false;
let isScreenSharing = false;
let chatMessages = [];

// Avatar and camera system
let currentAvatar = null;
let avatarData = {
    type: 'preset',
    url: null,
    name: 'Student',
    preset: 'male1'
};
let cameraMode = 'third-person'; // 'first-person', 'third-person', 'free-look'
let cameraControls = {
    distance: 8,
    height: 3,
    angle: 0
};
let isPointerLocked = false;
let mouseSensitivity = 0.002;

// Multiplayer system
let otherAvatars = [];
let userCount = 1;

// Leaderboard and scoring system
let userScore = 1850; // Demo score
let unlockedAvatars = ['male1', 'female1', 'male2', 'female2']; // Always unlocked
let avatarUnlockRequirements = {
    'ninja': 500,
    'robot': 750,
    'wizard': 1000,
    'superhero': 1500,
    'dragon': 2000,
    'phoenix': 2500,
    'cosmic': 3000,
    'legendary': 5000
};

// Avatar customization
let selectedColor = 'blue';
let selectedSize = 1.0;

// Ready Player Me API configuration
const READY_PLAYER_ME_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key
const READY_PLAYER_ME_BASE_URL = 'https://api.readyplayer.me/v1';
const READY_PLAYER_ME_AVATAR_URL = 'https://rohan-im0x30.readyplayer.me/avatar/choose';

// Room data
const roomData = {
    'mentor-room': {
        name: 'Mentor Room',
        position: { x: 0, y: 0, z: 0 },
        color: 0x2C3E50,
        description: 'Interactive meeting space for mentorship sessions'
    },
    'innovation-lab': {
        name: 'Innovation Lab', 
        position: { x: 20, y: 0, z: 0 },
        color: 0x8E44AD,
        description: 'Modern tech space for showcasing projects'
    },
    'career-hall': {
        name: 'Career Hall',
        position: { x: -20, y: 0, z: 0 },
        color: 0x27AE60,
        description: 'Professional space for career guidance'
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Metaverse Hub initialized');
    console.log('THREE.js available:', !!window.THREE);
    console.log('GLTFLoader available:', !!(window.THREE && THREE.GLTFLoader));
    setupEventListeners();
    setupRoomButtons();
    addSystemMessage('Welcome to Metaverse Hub! Select a room to begin.');
});

// Setup room selection buttons
function setupRoomButtons() {
    const enterButtons = document.querySelectorAll('button[onclick*="selectRoom"]');
    enterButtons.forEach(button => {
        button.removeAttribute('onclick');
        const roomId = button.closest('.room-card').getAttribute('data-room');
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectRoom(roomId);
        });
    });
}

// Event Listeners
function setupEventListeners() {
    // Movement controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    
    // Pointer lock events
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);
    
    // Mouse click events for interaction
    document.addEventListener('click', onMouseClick);
    
    // UI controls setup - will be activated when in 3D mode
    const micToggle = document.getElementById('mic-toggle');
    const screenShare = document.getElementById('screen-share');
    const chatToggle = document.getElementById('chat-toggle');
    
    if(micToggle) micToggle.addEventListener('click', toggleMicrophone);
    if(screenShare) screenShare.addEventListener('click', toggleScreenShare);
    if(chatToggle) chatToggle.addEventListener('click', toggleChat);
    
    // Chat input
    const chatInput = document.getElementById('chat-input');
    if(chatInput) chatInput.addEventListener('keypress', handleChatInput);
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

// Room selection - Fixed function
function selectRoom(roomId) {
    console.log('Selecting room:', roomId);
    currentRoom = roomId;
    showAvatarModal();
}

// Global functions for HTML onclick handlers
window.selectRoom = selectRoom;
window.closeAvatarModal = closeAvatarModal;
window.enterRoom = enterRoom;
window.exitRoom = exitRoom;
window.switchRoom = switchRoom;
window.toggleChat = toggleChat;
window.sendMessage = sendMessage;
window.handleChatInput = handleChatInput;
window.stopScreenShare = stopScreenShare;

// Avatar creation functions
window.switchTab = switchTab;
window.generateAvatarFromPhoto = generateAvatarFromPhoto;
window.openReadyPlayerMe = openReadyPlayerMe;
window.loadReadyPlayerAvatar = loadReadyPlayerAvatar;
window.selectPreset = selectPreset;
window.usePresetAvatar = usePresetAvatar;
window.removePhoto = removePhoto;
window.setCameraView = setCameraView;

function showAvatarModal() {
    console.log('Showing avatar modal');
    const modal = document.getElementById('avatar-modal');
    if(modal) {
        modal.classList.remove('hidden');
        // Initialize avatar preview
        setTimeout(() => initAvatarPreview(), 100);
        // Setup file upload
        setupFileUpload();
        // Setup avatar customization
        setupAvatarCustomization();
        // Update score display
        updateScoreDisplay();
        // Update avatar availability
        updateAvatarAvailability();
    } else {
        console.error('Avatar modal not found');
    }
}

// Avatar Creation Functions
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + '-tab');
    const selectedBtn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    
    if(selectedTab) selectedTab.classList.add('active');
    if(selectedBtn) selectedBtn.classList.add('active');
}

function setupFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('photo-upload');
    
    if(!uploadArea || !fileInput) return;
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selection
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if(files.length > 0) {
            handleFileSelect({ target: { files: files } });
        }
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    // Validate file type
    if(!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, etc.)');
        return;
    }
    
    // Validate file size (5MB limit)
    if(file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }
    
    // Display preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const uploadedPhoto = document.getElementById('uploaded-photo');
        const photoPreview = document.getElementById('photo-preview');
        const uploadArea = document.getElementById('upload-area');
        
        if(photoPreview) photoPreview.src = e.target.result;
        if(uploadedPhoto) uploadedPhoto.classList.remove('hidden');
        if(uploadArea) uploadArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    const uploadedPhoto = document.getElementById('uploaded-photo');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('photo-upload');
    
    if(uploadedPhoto) uploadedPhoto.classList.add('hidden');
    if(uploadArea) uploadArea.style.display = 'block';
    if(fileInput) fileInput.value = '';
}

function generateAvatarFromPhoto() {
    const photoPreview = document.getElementById('photo-preview');
    const avatarName = document.getElementById('avatar-name');
    
    if(!photoPreview || !photoPreview.src) {
        alert('Please upload a photo first');
        return;
    }
    
    // Get generation options
    const generationMode = document.querySelector('input[name="generation-mode"]:checked').value;
    const hairColor = document.getElementById('hair-color').value;
    const eyeColor = document.getElementById('eye-color').value;
    const skinTone = document.getElementById('skin-tone').value;
    
    // INSTANT GENERATION - Update status immediately!
    updateGenerationStatus('Generating avatar instantly...');
    addSystemMessage('Generating avatar instantly...');
    
    // Generate avatar immediately
    simulateAIAvatarGeneration(photoPreview.src, generationMode, {
        hairColor,
        eyeColor,
        skinTone,
        name: avatarName ? avatarName.value : 'Student'
    });
    
    // Show success message immediately
    completeAvatarGeneration();
}

function showGenerationProgress() {
    const progressDiv = document.getElementById('generation-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const generateBtn = document.getElementById('generate-btn');
    const generateText = document.getElementById('generate-text');
    const generateSpinner = document.getElementById('generate-spinner');
    
    if(progressDiv) progressDiv.classList.remove('hidden');
    if(generateBtn) generateBtn.disabled = true;
    if(generateText) generateText.classList.add('hidden');
    if(generateSpinner) generateSpinner.classList.remove('hidden');
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if(progress > 100) progress = 100;
        
        if(progressFill) progressFill.style.width = progress + '%';
        
        if(progress < 30) {
            if(progressText) progressText.textContent = 'Analyzing your photo...';
        } else if(progress < 60) {
            if(progressText) progressText.textContent = 'Generating 3D model...';
        } else if(progress < 90) {
            if(progressText) progressText.textContent = 'Applying customizations...';
        } else {
            if(progressText) progressText.textContent = 'Finalizing avatar...';
        }
        
        if(progress >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                hideGenerationProgress();
                completeAvatarGeneration();
            }, 500);
        }
    }, 200);
}

function hideGenerationProgress() {
    const progressDiv = document.getElementById('generation-progress');
    const generateBtn = document.getElementById('generate-btn');
    const generateText = document.getElementById('generate-text');
    const generateSpinner = document.getElementById('generate-spinner');
    
    if(progressDiv) progressDiv.classList.add('hidden');
    if(generateBtn) generateBtn.disabled = false;
    if(generateText) generateText.classList.remove('hidden');
    if(generateSpinner) generateSpinner.classList.add('hidden');
}

function simulateAIAvatarGeneration(photoSrc, mode, options) {
    // INSTANT AVATAR GENERATION - No waiting time!
    console.log('AI Avatar Generation:', {
        photo: photoSrc,
        mode: mode,
        options: options
    });
    
    // Create avatar data immediately
    avatarData = {
        type: 'ai-generated',
        url: photoSrc,
        name: options.name,
        mode: mode,
        customizations: {
            hairColor: options.hairColor,
            eyeColor: options.eyeColor,
            skinTone: options.skinTone
        }
    };
    
    // Award points for using AI generation
    addScore(50);
    
    // Enable enter button immediately
    enableEnterButton();
    
    // Update avatar preview instantly
    updateAvatarPreview(photoSrc, mode, options);
}

function updateAvatarPreview(photoSrc, mode, options) {
    const previewContainer = document.getElementById('avatar-preview-canvas');
    if(!previewContainer) return;
    
    // Clear existing content
    previewContainer.innerHTML = '';
    
    try {
        // Create a more realistic avatar preview based on the photo
        const previewScene = new THREE.Scene();
        const previewCamera = new THREE.PerspectiveCamera(75, 200/300, 0.1, 1000);
        const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        previewRenderer.setSize(200, 300);
        previewRenderer.setClearColor(0x000000, 0);
        previewContainer.appendChild(previewRenderer.domElement);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        previewScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        previewScene.add(directionalLight);
        
        // Create realistic avatar based on photo analysis
        const avatarColor = analyzePhotoForAvatarColor(photoSrc, options);
        const avatarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const avatarMaterial = new THREE.MeshLambertMaterial({ color: avatarColor });
        const previewAvatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
        previewAvatar.position.set(0, -0.5, 0);
        previewScene.add(previewAvatar);
        
        // Add photo texture to avatar (simulate realistic appearance)
        if(mode === 'realistic') {
            addPhotoTextureToAvatar(previewAvatar, photoSrc);
        }
        
        previewCamera.position.set(0, 0, 2.5);
        previewCamera.lookAt(0, 0, 0);
        
        // Render loop for preview
        function renderPreview() {
            if(previewContainer.parentNode) {
                requestAnimationFrame(renderPreview);
                previewAvatar.rotation.y += 0.02;
                previewRenderer.render(previewScene, previewCamera);
            }
        }
        renderPreview();
        
        console.log('Realistic avatar preview updated instantly');
    } catch(error) {
        console.error('Avatar preview error:', error);
        previewContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Avatar Ready!</div>';
    }
}

function analyzePhotoForAvatarColor(photoSrc, options) {
    // Analyze photo to determine avatar color based on the person's appearance
    // This is a simplified version - in a real implementation, you'd use image analysis
    
    const img = new Image();
    img.src = photoSrc;
    
    // Default colors based on customization options
    let baseColor = 0x4a90e2; // Default blue
    
    if(options.skinTone !== 'auto') {
        switch(options.skinTone) {
            case 'light': baseColor = 0xfdbcb4; break;
            case 'medium': baseColor = 0xe8a87c; break;
            case 'dark': baseColor = 0x8b4513; break;
        }
    }
    
    if(options.hairColor !== 'auto') {
        switch(options.hairColor) {
            case 'black': baseColor = 0x2c3e50; break;
            case 'brown': baseColor = 0x8b4513; break;
            case 'blonde': baseColor = 0xf4d03f; break;
            case 'red': baseColor = 0xe74c3c; break;
            case 'gray': baseColor = 0x95a5a6; break;
        }
    }
    
    return baseColor;
}

function addPhotoTextureToAvatar(avatar, photoSrc) {
    // Add photo texture to make avatar look more like the person
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(photoSrc, function(texture) {
        // Create a material that combines the photo with the avatar
        const material = new THREE.MeshLambertMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.8
        });
        avatar.material = material;
    });
}

function updateGenerationStatus(text) {
    const statusText = document.getElementById('status-text');
    if(statusText) {
        statusText.textContent = text;
    }
}

function completeAvatarGeneration() {
    const mode = avatarData.mode || 'realistic';
    let message = `AI-generated ${mode} avatar created successfully!`;
    
    if(avatarData.customizations) {
        const customizations = [];
        if(avatarData.customizations.hairColor !== 'auto') customizations.push(`hair: ${avatarData.customizations.hairColor}`);
        if(avatarData.customizations.eyeColor !== 'auto') customizations.push(`eyes: ${avatarData.customizations.eyeColor}`);
        if(avatarData.customizations.skinTone !== 'auto') customizations.push(`skin: ${avatarData.customizations.skinTone}`);
        
        if(customizations.length > 0) {
            message += ` Customizations applied: ${customizations.join(', ')}.`;
        }
    }
    
    updateGenerationStatus('Avatar generated successfully! Ready to enter room.');
    addSystemMessage(message);
    addSystemMessage('+50 points for AI avatar generation!');
}

function openReadyPlayerMeCreator() {
    // Open Ready Player Me creator in a new window
    const rpmUrl = 'https://rohan-im0x30.readyplayer.me/avatar/choose';
    window.open(rpmUrl, '_blank', 'width=1200,height=800');
    addSystemMessage('Ready Player Me creator opened! Create your avatar and copy the URL when done.');
    
    // Enable the load button after opening
    setTimeout(() => {
        const loadBtn = document.getElementById('load-readyplayer-btn');
        if(loadBtn) {
            loadBtn.disabled = false;
            loadBtn.textContent = '🚀 Use This Avatar';
        }
    }, 2000);
}

function loadSampleAvatars() {
    // Show sample avatars from Ready Player Me
    const sampleAvatars = [
        {
            name: 'Business Professional',
            url: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8b8.glb',
            image: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8b8.png'
        },
        {
            name: 'Casual Student',
            url: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8b9.glb',
            image: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8b9.png'
        },
        {
            name: 'Creative Designer',
            url: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8ba.glb',
            image: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8ba.png'
        },
        {
            name: 'Tech Professional',
            url: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8bb.glb',
            image: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8bb.png'
        },
        {
            name: 'Academic Scholar',
            url: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8bc.glb',
            image: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8bc.png'
        },
        {
            name: 'Innovation Leader',
            url: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8bd.glb',
            image: 'https://models.readyplayer.me/64f5b8b8b8b8b8b8b8b8b8bd.png'
        }
    ];
    
    // Create sample avatars display
    const previewContainer = document.getElementById('readyplayer-preview');
    if(previewContainer) {
        previewContainer.innerHTML = `
            <div class="sample-avatars">
                ${sampleAvatars.map(avatar => `
                    <div class="sample-avatar" onclick="selectSampleAvatar('${avatar.url}', '${avatar.name}')">
                        <img src="${avatar.image}" alt="${avatar.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0YTkwZTIiLz4KPHN2ZyB4PSIyMCIgeT0iMjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMmMtMi4yMSAwLTQtMS43OS00LTRzMS43OS00IDQtNCA0IDEuNzkgNCA0LTEuNzkgNC00IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz4KPC9zdmc+Cjwvc3ZnPgo='">
                        <h6>${avatar.name}</h6>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    addSystemMessage('Browse sample avatars from Ready Player Me!');
}

function selectSampleAvatar(url, name) {
    // Select a sample avatar
    const urlInput = document.getElementById('readyplayer-url');
    const nameInput = document.getElementById('avatar-name-rpm');
    const loadBtn = document.getElementById('load-readyplayer-btn');
    
    if(urlInput) urlInput.value = url;
    if(nameInput) nameInput.value = name;
    if(loadBtn) loadBtn.disabled = false;
    
    // Update preview
    const previewContainer = document.getElementById('readyplayer-preview');
    if(previewContainer) {
        previewContainer.innerHTML = `
            <div class="selected-avatar-preview">
                <h6>Selected: ${name}</h6>
                <p>Ready to use this avatar!</p>
            </div>
        `;
    }
    
    addSystemMessage(`Selected ${name} avatar!`);
}

function loadReadyPlayerAvatar() {
    const urlInput = document.getElementById('readyplayer-url');
    const nameInput = document.getElementById('avatar-name-rpm');
    
    if(!urlInput || !urlInput.value) {
        alert('Please enter a Ready Player Me avatar URL or select a sample avatar');
        return;
    }
    
    const avatarUrl = urlInput.value;
    const avatarName = nameInput ? nameInput.value : 'Student';
    
    // Set avatar data
    avatarData = {
        type: 'readyplayer',
        url: avatarUrl,
        name: avatarName,
        preset: null
    };
    
    // Award points for using Ready Player Me
    addScore(75);
    
    enableEnterButton();
    addSystemMessage(`Ready Player Me avatar loaded: ${avatarName}`);
    
    // Update preview
    const previewContainer = document.getElementById('readyplayer-preview');
    if(previewContainer) {
        previewContainer.innerHTML = `
            <div class="selected-avatar-preview">
                <h6>✅ Ready Player Me Avatar Selected</h6>
                <p>${avatarName}</p>
                <p>High-quality 3D avatar ready!</p>
            </div>
        `;
    }
}

function selectPreset(preset) {
    // Remove selection from all presets
    document.querySelectorAll('.preset-avatar').forEach(avatar => {
        avatar.classList.remove('selected');
    });
    
    // Add selection to clicked preset
    const selectedAvatar = document.querySelector(`[data-preset="${preset}"]`);
    if(selectedAvatar) {
        selectedAvatar.classList.add('selected');
    }
    
    avatarData.preset = preset;
}

function usePresetAvatar() {
    const nameInput = document.getElementById('avatar-name-preset');
    
    if(!avatarData.preset) {
        alert('Please select a preset avatar');
        return;
    }
    
    avatarData = {
        type: 'preset',
        url: null,
        name: nameInput ? nameInput.value : 'Student',
        preset: avatarData.preset
    };
    
    enableEnterButton();
    addSystemMessage(`Preset avatar "${avatarData.preset}" selected!`);
}

function enableEnterButton() {
    const enterBtn = document.getElementById('enter-room-btn');
    if(enterBtn) {
        enterBtn.disabled = false;
    }
}

// Leaderboard and scoring system
function addScore(points) {
    userScore += points;
    updateScoreDisplay();
    checkForUnlocks();
    
    // Show score notification
    addSystemMessage(`+${points} points! Total: ${userScore}`);
}

function updateScoreDisplay() {
    const scoreElement = document.getElementById('user-score');
    if(scoreElement) {
        scoreElement.textContent = userScore.toLocaleString();
    }
}

function checkForUnlocks() {
    let newUnlocks = [];
    
    for(const [avatar, requiredScore] of Object.entries(avatarUnlockRequirements)) {
        if(!unlockedAvatars.includes(avatar) && userScore >= requiredScore) {
            unlockedAvatars.push(avatar);
            newUnlocks.push(avatar);
        }
    }
    
    if(newUnlocks.length > 0) {
        updateAvatarAvailability();
        showUnlockNotification(newUnlocks);
    }
}

function updateAvatarAvailability() {
    document.querySelectorAll('.preset-avatar').forEach(avatar => {
        const preset = avatar.getAttribute('data-preset');
        const unlockStatus = avatar.querySelector('.unlock-status');
        
        if(unlockedAvatars.includes(preset)) {
            avatar.classList.remove('locked');
            avatar.classList.add('available');
            if(unlockStatus) {
                unlockStatus.textContent = '✓ Available';
                unlockStatus.style.color = 'var(--color-success)';
            }
        } else {
            const requiredScore = avatarUnlockRequirements[preset];
            if(requiredScore && unlockStatus) {
                unlockStatus.textContent = `🔒 ${requiredScore} pts`;
            }
        }
    });
}

function showUnlockNotification(unlockedAvatars) {
    unlockedAvatars.forEach(avatar => {
        const avatarName = avatar.charAt(0).toUpperCase() + avatar.slice(1);
        addSystemMessage(`🎉 New avatar unlocked: ${avatarName}!`);
    });
}

function selectPreset(preset) {
    // Check if avatar is unlocked
    if(!unlockedAvatars.includes(preset)) {
        const requiredScore = avatarUnlockRequirements[preset];
        if(requiredScore) {
            alert(`This avatar requires ${requiredScore} points to unlock. You currently have ${userScore} points.`);
            return;
        }
    }
    
    // Remove selection from all presets
    document.querySelectorAll('.preset-avatar').forEach(avatar => {
        avatar.classList.remove('selected');
    });
    
    // Add selection to clicked preset
    const selectedAvatar = document.querySelector(`[data-preset="${preset}"]`);
    if(selectedAvatar) {
        selectedAvatar.classList.add('selected');
    }
    
    avatarData.preset = preset;
    
    // Award points for selecting premium avatars
    if(avatarUnlockRequirements[preset]) {
        addScore(10);
    }
}

function usePresetAvatar() {
    const nameInput = document.getElementById('avatar-name-preset');
    
    if(!avatarData.preset) {
        alert('Please select a preset avatar');
        return;
    }
    
    avatarData = {
        type: 'preset',
        url: null,
        name: nameInput ? nameInput.value : 'Student',
        preset: avatarData.preset,
        color: selectedColor,
        size: selectedSize
    };
    
    enableEnterButton();
    addSystemMessage(`Preset avatar "${avatarData.preset}" selected!`);
    
    // Award points for using premium avatars
    if(avatarUnlockRequirements[avatarData.preset]) {
        addScore(25);
    }
}

// Avatar customization functions
function setupAvatarCustomization() {
    // Color palette selection
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedColor = this.getAttribute('data-color');
        });
    });
    
    // Size slider
    const sizeSlider = document.getElementById('avatar-size');
    const sizeValue = document.getElementById('size-value');
    
    if(sizeSlider && sizeValue) {
        sizeSlider.addEventListener('input', function() {
            selectedSize = parseFloat(this.value);
            sizeValue.textContent = selectedSize.toFixed(1) + 'x';
        });
    }
    
    // Initialize with default selections
    document.querySelector('.color-option[data-color="blue"]').classList.add('selected');
}

function closeAvatarModal() {
    console.log('Closing avatar modal');
    const modal = document.getElementById('avatar-modal');
    if(modal) {
        modal.classList.add('hidden');
    }
}

function initAvatarPreview() {
    const previewContainer = document.getElementById('avatar-preview-canvas');
    if(!previewContainer) return;
    
    // Clear any existing content
    previewContainer.innerHTML = '';
    
    // Check if THREE.js is loaded
    if(!window.THREE) {
        previewContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Loading 3D engine...</div>';
        return;
    }
    
    try {
        // Simple preview setup
        const previewScene = new THREE.Scene();
        const previewCamera = new THREE.PerspectiveCamera(75, 200/300, 0.1, 1000);
        const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        previewRenderer.setSize(200, 300);
        previewRenderer.setClearColor(0x000000, 0);
        previewContainer.appendChild(previewRenderer.domElement);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        previewScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        previewScene.add(directionalLight);
        
        // Create simple avatar representation for preview
        const avatarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const avatarMaterial = new THREE.MeshLambertMaterial({ color: 0x00aaff });
        const previewAvatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
        previewAvatar.position.set(0, -0.5, 0);
        previewScene.add(previewAvatar);
        
        previewCamera.position.set(0, 0, 2.5);
        previewCamera.lookAt(0, 0, 0);
        
        // Render loop for preview
        function renderPreview() {
            if(previewContainer.parentNode) {
                requestAnimationFrame(renderPreview);
                previewAvatar.rotation.y += 0.02;
                previewRenderer.render(previewScene, previewCamera);
            }
        }
        renderPreview();
        
        console.log('Avatar preview initialized');
    } catch(error) {
        console.error('Avatar preview error:', error);
        previewContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Avatar Preview</div>';
    }
}

// Enter room - Fixed function
function enterRoom() {
    console.log('Entering room:', currentRoom);
    
    if(!currentRoom) {
        console.error('No room selected');
        return;
    }
    
    closeAvatarModal();
    
    const dashboard = document.getElementById('dashboard');
    const metaverse = document.getElementById('metaverse-space');
    
    if(dashboard && metaverse) {
        dashboard.classList.add('hidden');
        metaverse.classList.remove('hidden');
        
        // Update room info
        const roomName = document.getElementById('current-room-name');
        if(roomName) {
            roomName.textContent = roomData[currentRoom].name;
        }
        
        // Show loading initially
        showLoading();
        
        // Initialize 3D environment with delay to ensure UI is ready
        setTimeout(() => {
            init3DEnvironment();
            initializeCommunication();
            simulateOtherUsers(); // Start multiplayer simulation
            addSystemMessage(`Welcome to ${roomData[currentRoom].name}!`);
            addSystemMessage('Use WASD keys to move around, mouse to look around.');
            addSystemMessage('Click on objects to interact with them.');
        }, 500);
    }
}

// 3D Environment Setup - Fixed
function init3DEnvironment() {
    try {
        // Check if THREE.js is loaded
        if(!window.THREE) {
            console.error('THREE.js not loaded');
            hideLoading();
            addSystemMessage('Error: 3D engine not loaded. Please refresh the page.');
            return;
        }
        
        const canvas = document.getElementById('three-canvas');
        if(!canvas) {
            console.error('Canvas not found');
            return;
        }
        
        // Enhanced scene setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(roomData[currentRoom].color);
        scene.fog = new THREE.Fog(roomData[currentRoom].color, 10, 50); // Add atmospheric fog
        
        // Enhanced camera setup
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 5);
        
        // Enhanced renderer setup
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.outputEncoding = THREE.sRGBEncoding;
        
        // Lighting
        setupLighting();
        
        // Create room environment
        createRoomEnvironment();
        
        // Load avatar
        loadAvatar();
        
        // Start render loop
        animate();
        
        console.log('3D environment initialized');
    } catch(error) {
        console.error('3D initialization error:', error);
        hideLoading();
        addSystemMessage('Error initializing 3D environment. Please try again.');
    }
}

function setupLighting() {
    // Enhanced ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Enhanced directional light with better shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(15, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    scene.add(directionalLight);
    
    // Additional fill light for better illumination
    const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
    fillLight.position.set(-10, 5, -5);
    scene.add(fillLight);
    
    // Rim light for depth
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 10, -15);
    scene.add(rimLight);
    
    // Point lights for ambiance
    const pointLight1 = new THREE.PointLight(0x00ff88, 0.3);
    pointLight1.position.set(-5, 3, -5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff8800, 0.3);
    pointLight2.position.set(5, 3, 5);
    scene.add(pointLight2);
}

function createRoomEnvironment() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Room-specific objects
    switch(currentRoom) {
        case 'mentor-room':
            createMentorRoom();
            break;
        case 'innovation-lab':
            createInnovationLab();
            break;
        case 'career-hall':
            createCareerHall();
            break;
    }
    
    // Enhanced walls with better materials
    createEnhancedWalls();
    
    // Add 3D effects
    add3DEffects();
}

function createMentorRoom() {
    // Enhanced larger round conference table for meetings
    const tableGeometry = new THREE.CylinderGeometry(5, 5, 0.3, 32);
    const tableMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 30,
        specular: 0x222222
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, 0.75, 0);
    table.castShadow = true;
    table.receiveShadow = true;
    table.userData = { type: 'interactive', name: 'conference-table' };
    scene.add(table);
    
    // Interactive chairs around the round table (more chairs for larger meetings)
    const chairPositions = [
        { x: 0, z: 6.5, rotation: 0 },      // North
        { x: 4.6, z: 4.6, rotation: Math.PI/4 },  // Northeast
        { x: 6.5, z: 0, rotation: Math.PI/2 },    // East
        { x: 4.6, z: -4.6, rotation: 3*Math.PI/4 }, // Southeast
        { x: 0, z: -6.5, rotation: Math.PI },     // South
        { x: -4.6, z: -4.6, rotation: -3*Math.PI/4 }, // Southwest
        { x: -6.5, z: 0, rotation: -Math.PI/2 },  // West
        { x: -4.6, z: 4.6, rotation: -Math.PI/4 }, // Northwest
        { x: 2.3, z: 6.5, rotation: 0 },    // North-Northeast
        { x: -2.3, z: 6.5, rotation: 0 },   // North-Northwest
        { x: 6.5, z: 2.3, rotation: Math.PI/2 },    // East-Northeast
        { x: 6.5, z: -2.3, rotation: Math.PI/2 },   // East-Southeast
        { x: 2.3, z: -6.5, rotation: Math.PI },   // South-Southeast
        { x: -2.3, z: -6.5, rotation: Math.PI },  // South-Southwest
        { x: -6.5, z: 2.3, rotation: -Math.PI/2 },   // West-Northwest
        { x: -6.5, z: -2.3, rotation: -Math.PI/2 }   // West-Southwest
    ];
    
    chairPositions.forEach((pos, i) => {
        // Enhanced chair seat
        const seatGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8);
        const seatMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x654321,
            shininess: 20,
            specular: 0x111111
        });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(pos.x, 0.75, pos.z);
        seat.castShadow = true;
        seat.receiveShadow = true;
        seat.userData = { type: 'interactive', name: `chair-${i}`, seatNumber: i };
        scene.add(seat);
        
        // Enhanced chair back
        const backGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.1);
        const backMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x654321,
            shininess: 20,
            specular: 0x111111
        });
        const back = new THREE.Mesh(backGeometry, backMaterial);
        back.position.set(pos.x, 1.35, pos.z + 0.3);
        back.rotation.x = Math.PI/6; // Slight tilt
        back.castShadow = true;
        back.receiveShadow = true;
        back.userData = { type: 'interactive', name: `chair-back-${i}`, seatNumber: i };
        scene.add(back);
        
        // Chair legs
        for(let j = 0; j < 4; j++) {
            const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8);
            const legMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            const legAngle = (j / 4) * Math.PI * 2;
            leg.position.set(
                pos.x + Math.cos(legAngle) * 0.3,
                0.375,
                pos.z + Math.sin(legAngle) * 0.3
            );
            leg.castShadow = true;
            scene.add(leg);
        }
    });
    
    // Interactive whiteboard
    const boardGeometry = new THREE.PlaneGeometry(4, 2.5);
    const boardMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.set(0, 2, -7);
    board.userData = { type: 'interactive', name: 'whiteboard' };
    scene.add(board);
    
    // Whiteboard frame
    const frameGeometry = new THREE.BoxGeometry(4.2, 2.7, 0.1);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 2, -6.95);
    frame.castShadow = true;
    scene.add(frame);
    
    // Add some ambient lighting around the table
    const tableLight = new THREE.PointLight(0xffffff, 0.3, 10);
    tableLight.position.set(0, 3, 0);
    scene.add(tableLight);
}

function createInnovationLab() {
    // Digital screens
    for(let i = 0; i < 3; i++) {
        const screenGeometry = new THREE.PlaneGeometry(3, 2);
        const screenMaterial = new THREE.MeshLambertMaterial({ color: 0x001133 });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(-6 + i * 6, 2, -7);
        scene.add(screen);
        
        // Screen glow effect
        const glowGeometry = new THREE.PlaneGeometry(3.2, 2.2);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0066ff, 
            transparent: true, 
            opacity: 0.2 
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(-6 + i * 6, 2, -6.9);
        scene.add(glow);
    }
    
    // Lab tables
    for(let i = 0; i < 4; i++) {
        const labTableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
        const labTableMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const labTable = new THREE.Mesh(labTableGeometry, labTableMaterial);
        labTable.position.set(-3 + i * 2, 0.75, 2);
        labTable.castShadow = true;
        scene.add(labTable);
    }
}

function createCareerHall() {
    // Information kiosks
    for(let i = 0; i < 4; i++) {
        const kioskGeometry = new THREE.BoxGeometry(1, 2, 0.2);
        const kioskMaterial = new THREE.MeshLambertMaterial({ color: 0x2E8B57 });
        const kiosk = new THREE.Mesh(kioskGeometry, kioskMaterial);
        kiosk.position.set(-6 + i * 4, 1, -6);
        kiosk.castShadow = true;
        scene.add(kiosk);
    }
    
    // Consultation desks
    for(let i = 0; i < 2; i++) {
        const deskGeometry = new THREE.BoxGeometry(3, 0.1, 1.5);
        const deskMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const desk = new THREE.Mesh(deskGeometry, deskMaterial);
        desk.position.set(-2 + i * 4, 0.75, 3);
        desk.castShadow = true;
        scene.add(desk);
    }
}

function createWalls() {
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    
    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(30, 8);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 4, -15);
    scene.add(backWall);
    
    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(30, 8);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-15, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(15, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
}

function loadAvatar() {
    try {
        // Create simple avatar representation (fallback first)
        const avatarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
        const avatarMaterial = new THREE.MeshLambertMaterial({ color: 0x00aaff });
        avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
        avatar.position.set(0, 0.75, 3);
        avatar.castShadow = true;
        scene.add(avatar);
        
        hideLoading();
        console.log('Avatar loaded (simple version)');
        
        // Load avatar based on user selection
        if(avatarData.type === 'readyplayer' && avatarData.url) {
            loadReadyPlayerMeAvatar(avatarData.url);
        } else if(avatarData.type === 'ai-generated' || avatarData.type === 'photo') {
            // Load AI-generated avatar that matches the photo
            loadAIGeneratedAvatar(avatarData);
        } else if(avatarData.type === 'preset') {
            loadPresetAvatar(avatarData.preset);
        }
        
    } catch(error) {
        console.error('Avatar loading error:', error);
        hideLoading();
    }
}

function loadReadyPlayerMeAvatar(url) {
    if(!window.THREE) {
        console.warn('THREE.js not available');
        return;
    }
    
    // Check if GLTFLoader is available, if not, use a fallback
    if(!THREE.GLTFLoader) {
        console.warn('GLTFLoader not available, using preset avatar instead');
        loadPresetAvatar(avatarData.preset || 'male1');
        return;
    }
    
            const loader = new THREE.GLTFLoader();
            loader.load(
        url,
                function(gltf) {
                    // Remove simple avatar
            if(avatar) {
                    scene.remove(avatar);
            }
                    
                    // Add loaded avatar
                    avatar = gltf.scene;
                    avatar.scale.set(1, 1, 1);
                    avatar.position.set(0, 0, 3);
                    avatar.castShadow = true;
            
            // Enable shadows for all meshes in the avatar
            avatar.traverse((child) => {
                if(child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
                    scene.add(avatar);
                    
                    console.log('ReadyPlayer.me avatar loaded successfully');
            addSystemMessage(`Welcome ${avatarData.name}! High-quality avatar loaded!`);
                },
                function(progress) {
                    console.log('Avatar loading progress:', (progress.loaded / progress.total * 100) + '%');
                },
                function(error) {
                    console.warn('ReadyPlayer.me avatar failed to load, using simple avatar:', error);
            addSystemMessage('Avatar loading failed, using default avatar');
        }
    );
}

function loadPresetAvatar(preset) {
    // Remove existing avatar
    if(avatar) {
        scene.remove(avatar);
    }
    
    // Get customization options
    const color = avatarData.color || 'blue';
    const size = avatarData.size || 1.0;
    
    // Create human-like preset avatars
    avatar = createPresetHumanAvatar(preset, color, size);
    avatar.position.set(0, 0, 3);
    avatar.castShadow = true;
    
    scene.add(avatar);
    
    addSystemMessage(`Welcome ${avatarData.name}! Human-like "${preset}" avatar loaded!`);
    return;
    
    // Create different preset avatars with enhanced features
    let avatarColor = 0x00aaff;
    let avatarScale = 1;
    let avatarGeometry;
    let specialEffects = null;
    
    switch(preset) {
        case 'male1':
            avatarColor = getColorValue(color, 0x4a90e2);
            break;
        case 'female1':
            avatarColor = getColorValue(color, 0xe24a90);
            avatarScale = 0.9;
            break;
        case 'male2':
            avatarColor = getColorValue(color, 0x2ecc71);
            break;
        case 'female2':
            avatarColor = getColorValue(color, 0xf39c12);
            avatarScale = 0.9;
            break;
        case 'ninja':
            avatarColor = 0x2c3e50;
            avatarGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.6, 8);
            specialEffects = 'ninja';
            break;
        case 'robot':
            avatarColor = 0x7f8c8d;
            avatarGeometry = new THREE.BoxGeometry(0.6, 1.4, 0.4);
            specialEffects = 'robot';
            break;
        case 'wizard':
            avatarColor = 0x8e44ad;
            avatarGeometry = new THREE.CylinderGeometry(0.5, 0.3, 1.8, 8);
            specialEffects = 'wizard';
            break;
        case 'superhero':
            avatarColor = 0xe74c3c;
            avatarGeometry = new THREE.CylinderGeometry(0.6, 0.6, 1.7, 8);
            specialEffects = 'superhero';
            break;
        case 'dragon':
            avatarColor = 0x27ae60;
            avatarGeometry = new THREE.CylinderGeometry(0.7, 0.5, 2.0, 8);
            specialEffects = 'dragon';
            break;
        case 'phoenix':
            avatarColor = 0xf39c12;
            avatarGeometry = new THREE.CylinderGeometry(0.5, 0.4, 1.6, 8);
            specialEffects = 'phoenix';
            break;
        case 'cosmic':
            avatarColor = 0x3498db;
            avatarGeometry = new THREE.CylinderGeometry(0.6, 0.6, 1.8, 8);
            specialEffects = 'cosmic';
            break;
        case 'legendary':
            avatarColor = 0xf1c40f;
            avatarGeometry = new THREE.CylinderGeometry(0.8, 0.6, 2.2, 8);
            specialEffects = 'legendary';
            break;
    }
    
    // Use default geometry if not specified
    if(!avatarGeometry) {
        avatarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    }
    
    // Create avatar material
    const avatarMaterial = new THREE.MeshLambertMaterial({ color: avatarColor });
    avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
    
    // Apply scale (customization + preset scale)
    const finalScale = avatarScale * size;
    avatar.scale.set(finalScale, finalScale, finalScale);
    avatar.position.set(0, 0.75, 3);
    avatar.castShadow = true;
    
    // Add special effects for premium avatars
    if(specialEffects) {
        addSpecialEffects(avatar, specialEffects);
    }
    
    scene.add(avatar);
    
    let message = `Welcome ${avatarData.name}! ${preset.charAt(0).toUpperCase() + preset.slice(1)} avatar loaded!`;
    if(specialEffects) {
        message += ` Special effects activated!`;
    }
    
    addSystemMessage(message);
}

function getColorValue(colorName, defaultColor) {
    const colorMap = {
        'blue': 0x4a90e2,
        'red': 0xe24a90,
        'green': 0x2ecc71,
        'purple': 0x9b59b6,
        'gold': 0xf39c12
    };
    return colorMap[colorName] || defaultColor;
}

function addSpecialEffects(avatar, effectType) {
    switch(effectType) {
        case 'ninja':
            // Add subtle glow
            const ninjaGlow = new THREE.PointLight(0x2c3e50, 0.3, 5);
            ninjaGlow.position.set(0, 1, 0);
            avatar.add(ninjaGlow);
            break;
        case 'robot':
            // Add metallic shine
            avatar.material.metalness = 0.8;
            avatar.material.roughness = 0.2;
            break;
        case 'wizard':
            // Add magical aura
            const wizardAura = new THREE.PointLight(0x8e44ad, 0.5, 8);
            wizardAura.position.set(0, 2, 0);
            avatar.add(wizardAura);
            break;
        case 'superhero':
            // Add heroic glow
            const heroGlow = new THREE.PointLight(0xe74c3c, 0.4, 6);
            heroGlow.position.set(0, 1.5, 0);
            avatar.add(heroGlow);
            break;
        case 'dragon':
            // Add dragon fire effect
            const dragonFire = new THREE.PointLight(0xff4500, 0.6, 10);
            dragonFire.position.set(0, 2, 0);
            avatar.add(dragonFire);
            break;
        case 'phoenix':
            // Add phoenix flames
            const phoenixFlames = new THREE.PointLight(0xff6347, 0.7, 8);
            phoenixFlames.position.set(0, 1.8, 0);
            avatar.add(phoenixFlames);
            break;
        case 'cosmic':
            // Add cosmic energy
            const cosmicEnergy = new THREE.PointLight(0x00bfff, 0.8, 12);
            cosmicEnergy.position.set(0, 2.2, 0);
            avatar.add(cosmicEnergy);
            break;
        case 'legendary':
            // Add legendary golden aura
            const legendaryAura = new THREE.PointLight(0xffd700, 1.0, 15);
            legendaryAura.position.set(0, 2.5, 0);
            avatar.add(legendaryAura);
            break;
    }
}

// Multiplayer functions
function createOtherAvatar(userId, name, position, preset = 'male1') {
    // Create avatar for another user
    let avatarColor = 0x00aaff;
    let avatarScale = 1;
    
    switch(preset) {
        case 'male1':
            avatarColor = 0x4a90e2;
            break;
        case 'female1':
            avatarColor = 0xe24a90;
            avatarScale = 0.9;
            break;
        case 'male2':
            avatarColor = 0x2ecc71;
            break;
        case 'female2':
            avatarColor = 0xf39c12;
            avatarScale = 0.9;
            break;
    }
    
    const avatarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const avatarMaterial = new THREE.MeshLambertMaterial({ color: avatarColor });
    const otherAvatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
    otherAvatar.scale.set(avatarScale, avatarScale, avatarScale);
    otherAvatar.position.set(position.x, 0.75, position.z);
    otherAvatar.castShadow = true;
    otherAvatar.userData = { userId, name, type: 'other-user' };
    
    // Add name label above avatar
    const nameLabel = createNameLabel(name);
    nameLabel.position.set(0, 2.5, 0);
    otherAvatar.add(nameLabel);
    
    scene.add(otherAvatar);
    otherAvatars.push(otherAvatar);
    
    return otherAvatar;
}

function createNameLabel(name) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'white';
    context.font = '24px Arial';
    context.textAlign = 'center';
    context.fillText(name, canvas.width / 2, canvas.height / 2 + 8);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
}

function simulateOtherUsers() {
    // Simulate other users joining the room
    setTimeout(() => {
        if(Math.random() > 0.5) {
            const otherUser = createOtherAvatar(
                'user2',
                'Alex',
                { x: 2, z: 2 },
                'female1'
            );
            userCount++;
            updateUserCount();
            addSystemMessage('Alex joined the room');
        }
    }, 3000);
    
    setTimeout(() => {
        if(Math.random() > 0.5) {
            const otherUser = createOtherAvatar(
                'user3',
                'Jordan',
                { x: -2, z: 1 },
                'male2'
            );
            userCount++;
            updateUserCount();
            addSystemMessage('Jordan joined the room');
        }
    }, 6000);
    
    setTimeout(() => {
        if(Math.random() > 0.5) {
            const otherUser = createOtherAvatar(
                'user4',
                'Sam',
                { x: 1, z: -2 },
                'female2'
            );
            userCount++;
            updateUserCount();
            addSystemMessage('Sam joined the room');
        }
    }, 9000);
}

function updateUserCount() {
    const userCountElement = document.getElementById('user-count');
    if(userCountElement) {
        userCountElement.textContent = `${userCount} user${userCount > 1 ? 's' : ''} online`;
    }
}

function animateOtherAvatars() {
    // Simple animation for other avatars (idle movement)
    otherAvatars.forEach(avatar => {
        if(avatar && avatar.position) {
            // Gentle bobbing motion
            avatar.position.y = 0.75 + Math.sin(Date.now() * 0.001 + avatar.userData.userId.charCodeAt(0)) * 0.02;
            
            // Slight rotation
            avatar.rotation.y += 0.005;
        }
    });
}

// Animation and render loop
function animate() {
    if(!renderer || !scene || !camera) return;
    
    requestAnimationFrame(animate);
    
    // Update avatar mixer
    if(avatarMixer) {
        avatarMixer.update(0.016);
    }
    
    // Handle movement
    handleMovement();
    
    // Animate other avatars
    animateOtherAvatars();
    
    // Update camera
    updateCamera();
    
    // Animate particles if available
    if(window.animateParticles) {
        window.animateParticles();
    }
    
    // Render
    renderer.render(scene, camera);
}

// Movement handling
function handleMovement() {
    if(!avatar) return;
    
    // Enhanced movement system like Minecraft/PUBG
    const baseSpeed = 0.12;
    const runMultiplier = keys['ShiftLeft'] || keys['ShiftRight'] ? 2.5 : 1.0;
    const moveSpeed = baseSpeed * runMultiplier;
    let moved = false;
    
    // Get camera direction for relative movement
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Keep movement on horizontal plane
    cameraDirection.normalize();
    
    // Calculate right vector
    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
    rightVector.normalize();
    
    // Store old position for collision detection
    const oldPosition = avatar.position.clone();
    
    // Forward/backward movement
    if(keys['KeyW'] || keys['ArrowUp']) {
        avatar.position.add(cameraDirection.clone().multiplyScalar(moveSpeed));
        moved = true;
    }
    if(keys['KeyS'] || keys['ArrowDown']) {
        avatar.position.add(cameraDirection.clone().multiplyScalar(-moveSpeed));
        moved = true;
    }
    
    // Left/right movement (strafing)
    if(keys['KeyA'] || keys['ArrowLeft']) {
        avatar.position.add(rightVector.clone().multiplyScalar(-moveSpeed));
        moved = true;
    }
    if(keys['KeyD'] || keys['ArrowRight']) {
        avatar.position.add(rightVector.clone().multiplyScalar(moveSpeed));
        moved = true;
    }
    
    // Enhanced jumping system
    if(keys['Space'] && avatar.position.y <= 0.75) {
        avatar.position.y += 0.4;
        addSystemMessage('Jump!');
    }
    
    // Apply gravity
    if(avatar.position.y > 0.75) {
        avatar.position.y -= 0.08;
        if(avatar.position.y < 0.75) {
            avatar.position.y = 0.75;
        }
    }
    
    // Collision detection with room boundaries
    const roomBounds = 15; // Larger room for better movement
    if(avatar.position.x > roomBounds) {
        avatar.position.x = roomBounds;
    }
    if(avatar.position.x < -roomBounds) {
        avatar.position.x = -roomBounds;
    }
    if(avatar.position.z > roomBounds) {
        avatar.position.z = roomBounds;
    }
    if(avatar.position.z < -roomBounds) {
        avatar.position.z = -roomBounds;
    }
    
    // Update avatar rotation based on movement direction
    if(moved) {
        const moveDirection = new THREE.Vector3();
        if(keys['KeyW'] || keys['ArrowUp']) moveDirection.add(cameraDirection);
        if(keys['KeyS'] || keys['ArrowDown']) moveDirection.add(cameraDirection.clone().multiplyScalar(-1));
        if(keys['KeyA'] || keys['ArrowLeft']) moveDirection.add(rightVector.clone().multiplyScalar(-1));
        if(keys['KeyD'] || keys['ArrowRight']) moveDirection.add(rightVector);
        
        if(moveDirection.length() > 0) {
            moveDirection.normalize();
            const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
            avatar.rotation.y = targetRotation;
        }
    }
    
    // Animate avatar based on movement
    animateAvatarMovement(moved, keys['ShiftLeft'] || keys['ShiftRight']);
    
    // Update camera position for first-person view
    if(cameraMode === 'first-person') {
        camera.position.set(
            avatar.position.x,
            avatar.position.y + 1.6, // Eye level
            avatar.position.z
        );
    }
}

function updateCamera() {
    if(!avatar || !camera) return;
    
    switch(cameraMode) {
        case 'first-person':
            // First-person camera - camera is at avatar's eye level with mouse look
            camera.position.set(
                avatar.position.x,
                avatar.position.y + 1.6, // Eye level
                avatar.position.z
            );
            
            // Enhanced mouse look for first-person gaming experience
            if(isPointerLocked) {
                camera.rotation.y -= mouseX * mouseSensitivity;
                camera.rotation.x -= mouseY * mouseSensitivity;
                camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
                
                // Update avatar rotation based on camera rotation
                avatar.rotation.y = camera.rotation.y;
            } else {
                camera.rotation.copy(avatar.rotation);
            }
            break;
            
        case 'third-person':
            // Third-person camera - follows behind avatar with mouse look
            if(isPointerLocked) {
                // Mouse look for third-person
                cameraControls.angle -= mouseX * mouseSensitivity;
                cameraControls.height = Math.max(0.5, Math.min(3, cameraControls.height - mouseY * 0.1);
            }
            
            const cameraOffset = new THREE.Vector3(
                -Math.sin(avatar.rotation.y + cameraControls.angle) * cameraControls.distance,
                cameraControls.height,
                -Math.cos(avatar.rotation.y + cameraControls.angle) * cameraControls.distance
            );
            camera.position.copy(avatar.position).add(cameraOffset);
            camera.lookAt(avatar.position.x, avatar.position.y + 1, avatar.position.z);
            break;
            
        case 'free-look':
            // Free-look camera - can be controlled independently
            if(isPointerLocked) {
                // Update camera rotation based on mouse movement
                camera.rotation.y -= mouseX * mouseSensitivity;
                camera.rotation.x -= mouseY * mouseSensitivity;
                camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
            }
            break;
    }
}

// Camera view switching
function setCameraView(mode) {
    cameraMode = mode;
    
    // Update button states
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="setCameraView('${mode}')"]`);
    if(activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Handle pointer lock for free-look mode
    if(mode === 'free-look') {
        requestPointerLock();
    } else {
        exitPointerLock();
    }
    
    addSystemMessage(`Camera mode: ${mode.replace('-', ' ')}`);
}

function requestPointerLock() {
    const canvas = document.getElementById('three-canvas');
    if(canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock();
    }
}

function exitPointerLock() {
    if(document.exitPointerLock) {
        document.exitPointerLock();
    }
}

// Event handlers
function onKeyDown(event) {
    keys[event.code] = true;
}

function onKeyUp(event) {
    keys[event.code] = false;
}

function onMouseMove(event) {
    if(isPointerLocked) {
        // For pointer lock mode, use movement deltas
        mouseX = event.movementX || 0;
        mouseY = event.movementY || 0;
    } else {
        // For normal mode, use screen coordinates
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}

function onPointerLockChange() {
    isPointerLocked = document.pointerLockElement === document.getElementById('three-canvas');
    
    if(isPointerLocked) {
        addSystemMessage('Pointer locked - Mouse controls active');
    } else {
        addSystemMessage('Pointer unlocked');
    }
}

function onPointerLockError() {
    console.error('Pointer lock failed');
    addSystemMessage('Pointer lock failed - Some features may not work');
}

function onMouseClick(event) {
    if(!isPointerLocked || !scene || !camera) return;
    
    // Raycast to detect clicked objects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0); // Center of screen for pointer lock
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if(intersects.length > 0) {
        const clickedObject = intersects[0].object;
        if(clickedObject.userData && clickedObject.userData.type === 'interactive') {
            handleObjectInteraction(clickedObject);
        }
    }
}

function handleObjectInteraction(object) {
    const objectName = object.userData.name;
    
    switch(objectName) {
        case 'conference-table':
            addSystemMessage('You clicked on the conference table - Meeting mode activated!');
            activateMeetingMode();
            break;
        case 'whiteboard':
            addSystemMessage('You clicked on the whiteboard - Drawing mode activated!');
            activateWhiteboardMode();
            break;
        default:
            if(objectName.startsWith('chair-')) {
                const seatNumber = object.userData.seatNumber;
                addSystemMessage(`You clicked on chair ${seatNumber + 1} - Sitting down...`);
                sitInChair(seatNumber);
            }
            break;
    }
}

function activateMeetingMode() {
    // Award points for starting a meeting
    addScore(100);
    
    // Show meeting controls
    addSystemMessage('Meeting mode activated! You can now:');
    addSystemMessage('- Share your screen with other participants');
    addSystemMessage('- Use voice chat for discussions');
    addSystemMessage('- Take meeting notes on the whiteboard');
    addSystemMessage('- Invite others to join the meeting');
    
    // Enable enhanced voice chat
    if(mediaStream) {
        addSystemMessage('Voice chat enhanced for meeting mode');
    }
}

function activateWhiteboardMode() {
    // Award points for using whiteboard
    addScore(50);
    
    addSystemMessage('Whiteboard mode activated!');
    addSystemMessage('Click and drag to draw on the whiteboard');
    addSystemMessage('Press ESC to exit whiteboard mode');
    
    // In a real implementation, you would:
    // 1. Switch to drawing mode
    // 2. Enable mouse/touch drawing
    // 3. Show drawing tools (pen, eraser, colors)
    // 4. Allow saving/loading drawings
}

function sitInChair(seatNumber) {
    // Award points for sitting
    addScore(25);
    
    // Move avatar to chair position
    if(avatar) {
        const chairPositions = [
            { x: 0, z: 4.5 },      // North
            { x: 3.2, z: 3.2 },    // Northeast
            { x: 4.5, z: 0 },      // East
            { x: 3.2, z: -3.2 },   // Southeast
            { x: 0, z: -4.5 },     // South
            { x: -3.2, z: -3.2 },  // Southwest
            { x: -4.5, z: 0 },     // West
            { x: -3.2, z: 3.2 }    // Northwest
        ];
        
        const targetPosition = chairPositions[seatNumber];
        if(targetPosition) {
            // Smooth movement to chair
            animateToPosition(avatar, targetPosition);
            addSystemMessage(`Sitting in chair ${seatNumber + 1} - Perfect for meetings!`);
        }
    }
}

function animateToPosition(object, targetPosition) {
    const startPosition = object.position.clone();
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth movement
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        object.position.lerpVectors(startPosition, new THREE.Vector3(targetPosition.x, 0.75, targetPosition.z), easeProgress);
        
        if(progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function onWindowResize() {
    if(!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Communication functions
function initializeCommunication() {
    console.log('Initializing communication...');
    addSystemMessage('Communication system ready. Click buttons to activate features.');
    
    // Initialize WebRTC for voice chat
    initializeWebRTC();
}

function initializeWebRTC() {
    // Check for WebRTC support
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('WebRTC not supported in this browser');
        addSystemMessage('Voice chat not supported in this browser');
        return;
    }
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaStream = stream;
            console.log('Microphone access granted');
            addSystemMessage('Microphone ready - Voice chat available');
            
            // Set up audio context for voice processing
            setupAudioContext(stream);
        })
        .catch(error => {
            console.error('Microphone access denied:', error);
            addSystemMessage('Microphone access denied - Voice chat unavailable');
        });
}

function setupAudioContext(stream) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        
        // Create audio analyzer for voice activity detection
        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        
        // Monitor voice activity
        monitorVoiceActivity(analyzer);
        
        // Setup audio output for hearing other characters
        setupAudioOutput();
        
        addSystemMessage('Voice chat and audio output initialized!');
        
    } catch(error) {
        console.error('Audio context setup failed:', error);
    }
}

function monitorVoiceActivity(analyzer) {
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function checkVoiceActivity() {
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for(let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Update UI based on voice activity
        updateVoiceIndicator(average);
        
        requestAnimationFrame(checkVoiceActivity);
    }
    
    checkVoiceActivity();
}

function updateVoiceIndicator(volume) {
    const micButton = document.getElementById('mic-toggle');
    const micStatus = document.getElementById('mic-status');
    
    if(!micButton || !micStatus) return;
    
    // Update visual indicator based on volume
    if(volume > 30 && !isMicMuted) {
        micButton.style.background = 'rgba(34, 197, 94, 0.3)'; // Green glow when speaking
    } else {
        micButton.style.background = '';
    }
}

function toggleMicrophone() {
    const button = document.getElementById('mic-toggle');
    const status = document.getElementById('mic-status');
    
    if(!button || !status) return;
    
    isMicMuted = !isMicMuted;
    
    if(isMicMuted) {
        status.textContent = '🔇 Mic Off';
        button.classList.add('muted');
        addSystemMessage('Microphone muted.');
        
        // Mute the audio stream
        if(mediaStream) {
            mediaStream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });
        }
    } else {
        status.textContent = '🎤 Mic On';
        button.classList.remove('muted');
        addSystemMessage('Microphone unmuted.');
        
        // Unmute the audio stream
        if(mediaStream) {
            mediaStream.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
        }
    }
}

function toggleScreenShare() {
    const button = document.getElementById('screen-share');
    if(!button) return;
    
    if(!isScreenSharing) {
        startScreenShare();
    } else {
        stopScreenShare();
    }
}

function startScreenShare() {
    if(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            .then(stream => {
                isScreenSharing = true;
                const video = document.getElementById('shared-screen-video');
                const sharedScreen = document.getElementById('shared-screen');
                
                if(video && sharedScreen) {
                    video.srcObject = stream;
                    sharedScreen.classList.remove('hidden');
                }
                
                const button = document.getElementById('screen-share');
                if(button) button.classList.add('active');
                addSystemMessage('Screen sharing started.');
                
                stream.getVideoTracks()[0].addEventListener('ended', () => {
                    stopScreenShare();
                });
            })
            .catch(error => {
                console.error('Error starting screen share:', error);
                addSystemMessage('Screen sharing not available in this browser.');
            });
    } else {
        addSystemMessage('Screen sharing not supported in this browser.');
    }
}

function stopScreenShare() {
    const video = document.getElementById('shared-screen-video');
    const sharedScreen = document.getElementById('shared-screen');
    const button = document.getElementById('screen-share');
    
    if(video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    if(sharedScreen) sharedScreen.classList.add('hidden');
    if(button) button.classList.remove('active');
    
    isScreenSharing = false;
    addSystemMessage('Screen sharing stopped.');
}

// Chat functions
function toggleChat() {
    const chatPanel = document.getElementById('chat-panel');
    const button = document.getElementById('chat-toggle');
    
    if(!chatPanel || !button) return;
    
    if(chatPanel.classList.contains('hidden')) {
        chatPanel.classList.remove('hidden');
        button.classList.add('active');
        const chatInput = document.getElementById('chat-input');
        if(chatInput) chatInput.focus();
    } else {
        chatPanel.classList.add('hidden');
        button.classList.remove('active');
    }
}

function handleChatInput(event) {
    if(event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    if(!input) return;
    
    const message = input.value.trim();
    
    if(message) {
        const avatarName = document.getElementById('avatar-name');
        const senderName = (avatarName && avatarName.value) || 'Student';
        addMessage(senderName, message);
        input.value = '';
        input.focus();
    }
}

function addMessage(sender, text) {
    const messagesContainer = document.getElementById('chat-messages');
    if(!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    messageDiv.innerHTML = `
        <div class="chat-message-sender">${sender}:</div>
        <div class="chat-message-text">${text}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    chatMessages.push({ sender, text, timestamp: new Date() });
}

function addSystemMessage(text) {
    const messagesContainer = document.getElementById('chat-messages');
    if(!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.style.opacity = '0.7';
    
    messageDiv.innerHTML = `
        <div class="chat-message-sender">System:</div>
        <div class="chat-message-text">${text}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// AI-Generated Avatar Functions
function loadAIGeneratedAvatar(avatarData) {
    // Remove existing avatar
    if(avatar) {
        scene.remove(avatar);
    }
    
    // Create human-like anime avatar
    const mode = avatarData.mode || 'realistic';
    const customizations = avatarData.customizations || {};
    
    // Create human-like avatar with anime style
    avatar = createHumanLikeAvatar(mode, customizations, avatarData.url);
    avatar.position.set(0, 0, 3);
    avatar.castShadow = true;
    
    scene.add(avatar);
    
    let message = `Welcome ${avatarData.name}! Human-like ${mode} avatar loaded!`;
    if(mode === 'realistic') {
        message += ' This avatar is designed to match your photo!';
    }
    
    addSystemMessage(message);
    hideLoading();
}

function createHumanLikeAvatar(mode, customizations, photoUrl) {
    const avatarGroup = new THREE.Group();
    
    // Head (anime style)
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ 
        color: getSkinToneColor(customizations.skinTone) 
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.4, 0);
    head.castShadow = true;
    avatarGroup.add(head);
    
    // Hair
    const hairGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const hairMaterial = new THREE.MeshLambertMaterial({ 
        color: getHairColor(customizations.hairColor) 
    });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, 1.5, 0);
    hair.scale.set(1, 0.8, 1);
    avatarGroup.add(hair);
    
    // Body (torso)
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.8, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
        color: getClothingColor(mode) 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    avatarGroup.add(body);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6);
    const armMaterial = new THREE.MeshLambertMaterial({ 
        color: getSkinToneColor(customizations.skinTone) 
    });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 0.9, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    avatarGroup.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 0.9, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    avatarGroup.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6);
    const legMaterial = new THREE.MeshLambertMaterial({ 
        color: getClothingColor(mode) 
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, -0.4, 0);
    leftLeg.castShadow = true;
    avatarGroup.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, -0.4, 0);
    rightLeg.castShadow = true;
    avatarGroup.add(rightLeg);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshLambertMaterial({ 
        color: getEyeColor(customizations.eyeColor) 
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.45, 0.25);
    avatarGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.45, 0.25);
    avatarGroup.add(rightEye);
    
    // Add photo texture to head for realistic mode
    if(mode === 'realistic' && photoUrl) {
        addPhotoTextureToHead(head, photoUrl);
    }
    
    // Add special effects based on mode
    addHumanAvatarEffects(avatarGroup, mode);
    
    // Add body part labels for animation
    addBodyPartLabels(avatarGroup);
    
    return avatarGroup;
}

function getSkinToneColor(skinTone) {
    const skinColors = {
        'auto': 0xfdbcb4,
        'light': 0xfdbcb4,
        'medium': 0xe8a87c,
        'dark': 0x8b4513
    };
    return skinColors[skinTone] || skinColors['medium'];
}

function getHairColor(hairColor) {
    const hairColors = {
        'auto': 0x2c3e50,
        'black': 0x2c3e50,
        'brown': 0x8b4513,
        'blonde': 0xf4d03f,
        'red': 0xe74c3c,
        'gray': 0x95a5a6
    };
    return hairColors[hairColor] || hairColors['black'];
}

function getEyeColor(eyeColor) {
    const eyeColors = {
        'auto': 0x2c3e50,
        'brown': 0x8b4513,
        'blue': 0x3498db,
        'green': 0x2ecc71,
        'hazel': 0x8b4513
    };
    return eyeColors[eyeColor] || eyeColors['brown'];
}

function getClothingColor(mode) {
    const clothingColors = {
        'realistic': 0x34495e,
        'stylized': 0xe74c3c,
        'cartoon': 0x9b59b6
    };
    return clothingColors[mode] || clothingColors['realistic'];
}

function addPhotoTextureToHead(head, photoUrl) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(photoUrl, function(texture) {
        const material = new THREE.MeshLambertMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.8
        });
        head.material = material;
    });
}

function addHumanAvatarEffects(avatarGroup, mode) {
    // Add special lighting effects
    const light = new THREE.PointLight(0xffffff, 0.5, 3);
    light.position.set(0, 1.5, 0);
    avatarGroup.add(light);
    
    // Add mode-specific effects
    switch(mode) {
        case 'stylized':
            const stylizedGlow = new THREE.PointLight(0xff6b6b, 0.3, 2);
            stylizedGlow.position.set(0, 1.2, 0);
            avatarGroup.add(stylizedGlow);
            break;
        case 'cartoon':
            const cartoonGlow = new THREE.PointLight(0x4ecdc4, 0.4, 2.5);
            cartoonGlow.position.set(0, 1.3, 0);
            avatarGroup.add(cartoonGlow);
            break;
    }
}

function addPhotoTextureTo3DAvatar(avatar, photoSrc) {
    // Add photo texture to 3D avatar to make it look more like the person
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(photoSrc, function(texture) {
        // Create a material that combines the photo with the avatar
        const material = new THREE.MeshLambertMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        avatar.material = material;
        
        // Add a subtle glow effect
        const glowGeometry = new THREE.CylinderGeometry(0.52, 0.52, 1.52, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.1 
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        avatar.add(glow);
        
        console.log('Photo texture applied to 3D avatar');
    }, undefined, function(error) {
        console.warn('Could not load photo texture:', error);
    });
}

function addAIAvatarEffects(avatar, mode) {
    // Add special effects based on generation mode
    switch(mode) {
        case 'realistic':
            // Subtle realistic lighting
            const realisticLight = new THREE.PointLight(0xffffff, 0.3, 5);
            realisticLight.position.set(0, 1, 0);
            avatar.add(realisticLight);
            break;
        case 'stylized':
            // Artistic glow
            const stylizedLight = new THREE.PointLight(0xff6b6b, 0.4, 6);
            stylizedLight.position.set(0, 1.5, 0);
            avatar.add(stylizedLight);
            break;
        case 'cartoon':
            // Fun, colorful effects
            const cartoonLight = new THREE.PointLight(0x4ecdc4, 0.5, 7);
            cartoonLight.position.set(0, 1.2, 0);
            avatar.add(cartoonLight);
            break;
    }
}

// Human-like Avatar Functions
function createPresetHumanAvatar(preset, color, size) {
    const avatarGroup = new THREE.Group();
    
    // Base human structure
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.4, 0);
    head.castShadow = true;
    avatarGroup.add(head);
    
    // Hair
    const hairGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const hairMaterial = new THREE.MeshLambertMaterial({ color: getPresetHairColor(preset) });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, 1.5, 0);
    hair.scale.set(1, 0.8, 1);
    avatarGroup.add(hair);
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.8, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: getPresetClothingColor(preset) });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    avatarGroup.add(body);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 0.9, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    avatarGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 0.9, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    avatarGroup.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6);
    const legMaterial = new THREE.MeshLambertMaterial({ color: getPresetClothingColor(preset) });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, -0.4, 0);
    leftLeg.castShadow = true;
    avatarGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, -0.4, 0);
    rightLeg.castShadow = true;
    avatarGroup.add(rightLeg);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.45, 0.25);
    avatarGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.45, 0.25);
    avatarGroup.add(rightEye);
    
    // Add preset-specific features
    addPresetSpecialFeatures(avatarGroup, preset);
    
    // Add body part labels for animation
    addBodyPartLabels(avatarGroup);
    
    // Apply size scaling
    avatarGroup.scale.setScalar(size);
    
    return avatarGroup;
}

function getPresetHairColor(preset) {
    const hairColors = {
        'male1': 0x2c3e50,
        'female1': 0xe74c3c,
        'male2': 0x8b4513,
        'female2': 0xf4d03f,
        'ninja': 0x2c3e50,
        'robot': 0x95a5a6,
        'wizard': 0x9b59b6,
        'superhero': 0xe74c3c,
        'dragon': 0x8b4513,
        'phoenix': 0xf39c12,
        'cosmic': 0x3498db,
        'legendary': 0xf1c40f
    };
    return hairColors[preset] || 0x2c3e50;
}

function getPresetClothingColor(preset) {
    const clothingColors = {
        'male1': 0x4a90e2,
        'female1': 0xe24a90,
        'male2': 0x2ecc71,
        'female2': 0xf39c12,
        'ninja': 0x2c3e50,
        'robot': 0x95a5a6,
        'wizard': 0x9b59b6,
        'superhero': 0xe74c3c,
        'dragon': 0x8b4513,
        'phoenix': 0xf39c12,
        'cosmic': 0x3498db,
        'legendary': 0xf1c40f
    };
    return clothingColors[preset] || 0x4a90e2;
}

function addPresetSpecialFeatures(avatarGroup, preset) {
    // Add special features based on preset
    switch(preset) {
        case 'ninja':
            // Add ninja mask
            const maskGeometry = new THREE.SphereGeometry(0.32, 16, 16);
            const maskMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50, transparent: true, opacity: 0.8 });
            const mask = new THREE.Mesh(maskGeometry, maskMaterial);
            mask.position.set(0, 1.4, 0);
            mask.scale.set(1, 0.6, 1);
            avatarGroup.add(mask);
            break;
        case 'robot':
            // Add robot antenna
            const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
            const antennaMaterial = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.set(0, 1.8, 0);
            avatarGroup.add(antenna);
            break;
        case 'wizard':
            // Add wizard hat
            const hatGeometry = new THREE.ConeGeometry(0.3, 0.4, 8);
            const hatMaterial = new THREE.MeshLambertMaterial({ color: 0x9b59b6 });
            const hat = new THREE.Mesh(hatGeometry, hatMaterial);
            hat.position.set(0, 1.8, 0);
            avatarGroup.add(hat);
            break;
        case 'superhero':
            // Add cape
            const capeGeometry = new THREE.PlaneGeometry(0.8, 1.2);
            const capeMaterial = new THREE.MeshLambertMaterial({ color: 0xe74c3c, side: THREE.DoubleSide });
            const cape = new THREE.Mesh(capeGeometry, capeMaterial);
            cape.position.set(0, 0.8, -0.3);
            cape.rotation.x = 0.2;
            avatarGroup.add(cape);
            break;
    }
    
    // Add special lighting effects
    const light = new THREE.PointLight(0xffffff, 0.5, 3);
    light.position.set(0, 1.5, 0);
    avatarGroup.add(light);
}

// Audio Output Functions
function setupAudioOutput() {
    // Create audio output for hearing other characters
    if(!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.8; // Default volume
    gainNode.connect(audioContext.destination);
    
    // Store for later use
    window.audioGainNode = gainNode;
    
    // Create audio elements for different characters
    createCharacterAudioElements();
    
    addSystemMessage('Audio output ready - you can now hear other characters!');
}

function createCharacterAudioElements() {
    // Create audio elements for each character
    const characters = ['Jordan', 'Sam', 'Alex', 'Maya', 'Chris', 'Taylor'];
    
    characters.forEach(characterName => {
        const audioElement = document.createElement('audio');
        audioElement.id = `audio-${characterName.toLowerCase()}`;
        audioElement.volume = 0.7;
        audioElement.loop = false;
        document.body.appendChild(audioElement);
    });
    
    // Start simulating character conversations
    startCharacterConversations();
}

function startCharacterConversations() {
    // Simulate character conversations in meetings
    const conversations = [
        { speaker: 'Jordan', text: 'Welcome to the meeting everyone!', delay: 2000 },
        { speaker: 'Sam', text: 'Thanks for having us, Jordan!', delay: 5000 },
        { speaker: 'Alex', text: 'I\'m excited to discuss the new project.', delay: 8000 },
        { speaker: 'Jordan', text: 'Let\'s start with the quarterly review.', delay: 12000 },
        { speaker: 'Sam', text: 'The numbers look great this quarter.', delay: 15000 },
        { speaker: 'Alex', text: 'I agree, we\'ve made excellent progress.', delay: 18000 }
    ];
    
    conversations.forEach(conversation => {
        setTimeout(() => {
            playCharacterVoice(conversation.speaker, conversation.text);
        }, conversation.delay);
    });
    
    // Continue with random conversations
    setTimeout(() => {
        startRandomConversations();
    }, 20000);
}

function playCharacterVoice(characterName, text) {
    // Play character voice using Web Speech API
    if('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = getCharacterVoice(characterName);
        utterance.rate = 0.9;
        utterance.pitch = getCharacterPitch(characterName);
        utterance.volume = 0.8;
        
        // Add visual indicator
        showCharacterSpeaking(characterName, text);
        
        speechSynthesis.speak(utterance);
        
        addSystemMessage(`${characterName}: "${text}"`);
    }
}

function getCharacterVoice(characterName) {
    const voices = speechSynthesis.getVoices();
    const characterVoices = {
        'Jordan': voices.find(v => v.name.includes('Male')) || voices[0],
        'Sam': voices.find(v => v.name.includes('Female')) || voices[1],
        'Alex': voices.find(v => v.name.includes('Male')) || voices[2],
        'Maya': voices.find(v => v.name.includes('Female')) || voices[3],
        'Chris': voices.find(v => v.name.includes('Male')) || voices[4],
        'Taylor': voices.find(v => v.name.includes('Female')) || voices[5]
    };
    return characterVoices[characterName] || voices[0];
}

function getCharacterPitch(characterName) {
    const pitches = {
        'Jordan': 1.0,
        'Sam': 1.2,
        'Alex': 0.9,
        'Maya': 1.3,
        'Chris': 0.8,
        'Taylor': 1.1
    };
    return pitches[characterName] || 1.0;
}

function showCharacterSpeaking(characterName, text) {
    // Find the character in the scene and add speaking indicator
    const characterAvatars = scene.children.filter(child => 
        child.userData && child.userData.name === characterName
    );
    
    if(characterAvatars.length > 0) {
        const character = characterAvatars[0];
        
        // Add speaking bubble
        const bubbleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bubbleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.7 
        });
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        bubble.position.set(0, 2, 0);
        character.add(bubble);
        
        // Remove bubble after speaking
        setTimeout(() => {
            character.remove(bubble);
        }, 3000);
    }
}

function startRandomConversations() {
    const randomPhrases = [
        { speaker: 'Jordan', text: 'That\'s a great point!' },
        { speaker: 'Sam', text: 'I think we should consider this further.' },
        { speaker: 'Alex', text: 'Absolutely, let\'s discuss this.' },
        { speaker: 'Maya', text: 'I have some ideas about this.' },
        { speaker: 'Chris', text: 'What do you think about the timeline?' },
        { speaker: 'Taylor', text: 'That sounds like a good plan.' }
    ];
    
    // Random conversation every 10-15 seconds
    setInterval(() => {
        const randomPhrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];
        playCharacterVoice(randomPhrase.speaker, randomPhrase.text);
    }, Math.random() * 5000 + 10000);
}

// Avatar Animation Functions
function animateAvatarMovement(isMoving, isRunning) {
    if(!avatar) return;
    
    // Find body parts for animation
    const bodyParts = findAvatarBodyParts(avatar);
    
    if(isMoving) {
        // Walking/running animation
        const time = Date.now() * 0.01;
        const speed = isRunning ? 0.02 : 0.01;
        
        if(bodyParts.leftArm && bodyParts.rightArm) {
            // Arm swinging animation
            bodyParts.leftArm.rotation.z = Math.sin(time * speed) * 0.5;
            bodyParts.rightArm.rotation.z = -Math.sin(time * speed) * 0.5;
        }
        
        if(bodyParts.leftLeg && bodyParts.rightLeg) {
            // Leg walking animation
            bodyParts.leftLeg.rotation.x = Math.sin(time * speed) * 0.3;
            bodyParts.rightLeg.rotation.x = -Math.sin(time * speed) * 0.3;
        }
        
        // Body bobbing
        avatar.position.y = 0.1 + Math.sin(time * speed * 2) * 0.05;
        
    } else {
        // Idle animation
        const time = Date.now() * 0.005;
        
        if(bodyParts.leftArm && bodyParts.rightArm) {
            // Gentle arm movement
            bodyParts.leftArm.rotation.z = Math.sin(time) * 0.1;
            bodyParts.rightArm.rotation.z = -Math.sin(time) * 0.1;
        }
        
        // Gentle breathing motion
        avatar.position.y = 0.1 + Math.sin(time) * 0.02;
    }
}

function findAvatarBodyParts(avatar) {
    const bodyParts = {};
    
    // Search through avatar children to find body parts
    avatar.traverse((child) => {
        if(child.userData && child.userData.bodyPart) {
            bodyParts[child.userData.bodyPart] = child;
        }
    });
    
    return bodyParts;
}

function addBodyPartLabels(avatarGroup) {
    // Add userData to body parts for animation
    avatarGroup.traverse((child) => {
        if(child.geometry) {
            // Identify body parts by position
            if(child.position.y > 1.3 && child.position.y < 1.6) {
                child.userData.bodyPart = 'head';
            } else if(child.position.y > 0.4 && child.position.y < 1.2) {
                child.userData.bodyPart = 'body';
            } else if(child.position.x < -0.2) {
                child.userData.bodyPart = 'leftArm';
            } else if(child.position.x > 0.2) {
                child.userData.bodyPart = 'rightArm';
            } else if(child.position.y < 0 && child.position.x < 0) {
                child.userData.bodyPart = 'leftLeg';
            } else if(child.position.y < 0 && child.position.x > 0) {
                child.userData.bodyPart = 'rightLeg';
            }
        }
    });
}

// Room switching
function switchRoom(roomId) {
    if(roomId === currentRoom || !scene) return;
    
    console.log('Switching to room:', roomId);
    showLoading();
    addSystemMessage(`Switching to ${roomData[roomId].name}...`);
    
    // Update current room
    currentRoom = roomId;
    const roomName = document.getElementById('current-room-name');
    if(roomName) {
        roomName.textContent = roomData[currentRoom].name;
    }
    
    // Clear room objects but keep avatar and basic scene
    const objectsToRemove = [];
    scene.traverse(object => {
        if(object !== avatar && object.type === 'Mesh' && object.parent === scene) {
            objectsToRemove.push(object);
        }
    });
    
    objectsToRemove.forEach(object => {
        if(object !== avatar) {
            scene.remove(object);
        }
    });
    
    // Update background color
    scene.background = new THREE.Color(roomData[currentRoom].color);
    
    // Recreate room environment
    createRoomEnvironment();
    
    // Reset avatar position
    if(avatar && avatar.position) {
        avatar.position.set(0, 0.75, 3);
    }
    
    hideLoading();
    addSystemMessage(`Welcome to ${roomData[currentRoom].name}!`);
}

// UI helpers
function showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if(loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if(loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function exitRoom() {
    console.log('Exiting room...');
    
    // Clean up media streams
    if(mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    if(isScreenSharing) {
        stopScreenShare();
    }
    
    // Show dashboard, hide 3D space
    const dashboard = document.getElementById('dashboard');
    const metaverse = document.getElementById('metaverse-space');
    
    if(dashboard && metaverse) {
        metaverse.classList.add('hidden');
        dashboard.classList.remove('hidden');
    }
    
    // Clean up 3D objects
    if(renderer) {
        renderer.dispose();
        renderer = null;
    }
    
    if(scene) {
        scene.clear();
        scene = null;
    }
    
    // Reset variables
    currentRoom = null;
    avatar = null;
    camera = null;
    keys = {};
    
    console.log('Returned to dashboard');
}

// Enhanced walls function
function createEnhancedWalls() {
    // Floor with enhanced material
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B7355,
        shininess: 10,
        specular: 0x111111
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(50, 50);
    const ceilingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xF5F5F5,
        shininess: 5
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 10;
    scene.add(ceiling);
    
    // Enhanced walls
    const wallMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xE8E8E8,
        shininess: 5
    });
    
    // North wall
    const northWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMaterial);
    northWall.position.set(0, 5, -25);
    northWall.receiveShadow = true;
    scene.add(northWall);
    
    // South wall
    const southWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMaterial);
    southWall.position.set(0, 5, 25);
    southWall.receiveShadow = true;
    scene.add(southWall);
    
    // East wall
    const eastWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMaterial);
    eastWall.rotation.y = Math.PI / 2;
    eastWall.position.set(25, 5, 0);
    eastWall.receiveShadow = true;
    scene.add(eastWall);
    
    // West wall
    const westWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMaterial);
    westWall.rotation.y = Math.PI / 2;
    westWall.position.set(-25, 5, 0);
    westWall.receiveShadow = true;
    scene.add(westWall);
}

// Add 3D effects for enhanced visual experience
function add3DEffects() {
    // Add floating particles for ambiance
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 40;     // x
        positions[i + 1] = Math.random() * 8 + 2;      // y
        positions[i + 2] = (Math.random() - 0.5) * 40; // z
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x87CEEB,
        size: 0.1,
        transparent: true,
        opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Add subtle animation to particles
    function animateParticles() {
        particleSystem.rotation.y += 0.001;
        particleSystem.rotation.x += 0.0005;
    }
    
    // Store animation function for render loop
    window.animateParticles = animateParticles;
}