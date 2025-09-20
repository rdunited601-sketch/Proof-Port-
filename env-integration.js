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

// Hook up the Enter Room button if present
document.addEventListener('DOMContentLoaded', () => {
    const enterBtn = document.getElementById('enter-room-btn');
    if (enterBtn) {
        enterBtn.disabled = false;
        enterBtn.addEventListener('click', () => {
            // Hide dashboard and avatar modal
            const dashboard = document.getElementById('dashboard');
            if (dashboard) dashboard.style.display = 'none';
            const avatarModal = document.getElementById('avatar-modal');
            if (avatarModal) avatarModal.style.display = 'none';

            // Show game container
            const gameContainer = document.getElementById('game-container');
            if (gameContainer) gameContainer.style.display = 'block';

            // Determine selected avatar (best-effort). Auto-select the first avatar if none chosen.
            let avatarData = { type: 'preset', data: 'male1' };
            let selectedPreset = document.querySelector('.avatar-preset.selected');
            if (!selectedPreset) {
                selectedPreset = document.querySelector('.avatar-preset');
                if (selectedPreset) selectedPreset.classList.add('selected');
            }
            if (selectedPreset) {
                const model = selectedPreset.getAttribute('data-model');
                if (model) {
                    avatarData = { type: 'preset', data: model };
                } else {
                    const preset = selectedPreset.getAttribute('data-preset');
                    avatarData = { type: 'preset', data: preset };
                }
            }
            window.lastAvatarData = avatarData;

            // Initialize environment with avatar
            init3DEnvironment(avatarData);
            // clear any 'no room selected' notification
            const notif = document.querySelector('.notification.error');
            if (notif && notif.textContent.includes('No room')) notif.remove();
        });
    }
});
