// Small integration helpers for environment selection
function selectRoom(roomId) {
    window.currentRoom = roomId;
    // Open avatar modal first (workflow expects avatar selection)
    const avatarModal = document.getElementById('avatar-modal');
    if (avatarModal) avatarModal.style.display = 'block';
    // update current-room-name display
    const roomNameEl = document.getElementById('current-room-name');
    if (roomNameEl) roomNameEl.textContent = roomId.replace('-', ' ');
}

function switchRoom(roomId) {
    // If environment already initialized, recreate scene
    window.currentRoom = roomId;
    if (typeof scene !== 'undefined' && scene) {
        // clear scene
        while(scene.children.length > 0){
            scene.remove(scene.children[0]);
        }
        // re-init environment with same avatar if available
        init3DEnvironment(window.lastAvatarData || { type: 'preset', data: 'male1' });
    } else {
        init3DEnvironment({ type: 'preset', data: 'male1' });
    }
}

function exitRoom() {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) gameContainer.style.display = 'none';
    const dashboard = document.getElementById('dashboard');
    if (dashboard) dashboard.style.display = 'block';
    // stop any animation loop by setting renderer to null (simple stop)
    renderer = null;
}
