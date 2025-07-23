require('dotenv').config();
const OBSWebSocket = require('obs-websocket-js').default;
const obs = new OBSWebSocket();

const obs_host = process.env.OBS_HOST;
const obs_password = process.env.OBS_PASSWORD;

(async () => {
    try {
        await obs.connect(obs_host, obs_password);
        console.log('Connected to OBS WebSocket');

    // Testing connection by getting the current scene
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    console.log(`Current scene: ${currentProgramSceneName}`);
    } catch (error) {
        console.error('Failed to connect to OBS WebSocket:', error);
    }
})();

async function goldSound() {
    try {
        await obs.call('TriggerMediaInputAction', {
            inputName: 'Gold noise',
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
        });
        console.log(`[SUCCESS] Gold Noise played!`);
    } catch (error) {
        console.error('Failed to play gold sound:', error);
    }
}

function disconnectOBS() {
    obs.disconnect();
    console.log('Disconnected from OBS WebSocket');
}



module.exports = {
    goldSound,
    disconnectOBS
};
