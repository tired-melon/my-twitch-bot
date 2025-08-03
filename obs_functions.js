require('dotenv').config();
const OBSWebSocket = require('obs-websocket-js').default;
const obs = new OBSWebSocket();
const fs = require('fs');
const { parseFile } = require('music-metadata');


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
            inputName: 'Gold Noise',
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
        });
        console.log(`[SUCCESS] Gold Noise played!`);
    } catch (error) {
        console.error('Failed to play gold sound:', error);
    }
}

async function purchaseSound() {
    try {
        await obs.call('TriggerMediaInputAction', {
            inputName: 'Purchase Sound',
            mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
        });
        console.log(`[SUCCESS] Purchase Sound played!`)
    } catch (error) {
        console.error('Failed to play purchase sound:', error);
    }
}

function disconnectOBS() {
    obs.disconnect();
    console.log('Disconnected from OBS WebSocket');
}


async function ttsRead([files]) {
    isPlaying = true;
    
    const metadata = await parseFile(file);
    const duration = (metadata.format.duration * 1000) || 5000;// Convert to milliseconds
    console.log(`[DEBUG] TTS audio duration: ${duration}ms`);
    console.log(`[DEBUG] If it says 5000ms, the file may be staging a rebellion.`);
    try {
        await obs.call('CreateInput', {
            sceneName: currentProgramSceneName,
            inputName: 'TTS Audio',
            inputKind: 'ffmpeg_source',
            inputSettings: {
                local_file: file,
                loop: false,
            },
            sceneItemEnabled: true
        });
    } catch (err) {console.error('Error creating TTS audio source:', err);}


        // Set the audio monitor type to monitor and output
        // This allows the audio to be played through OBS and heard by the streamer
    try {
        await obs.call('SetInputAudioMonitorType', {
            inputName: 'TTS Audio',
            monitorType: 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT'
        });
    } catch (err) { console.error('Error setting audio monitor type:', err); }

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for the input to be created

    try {
        await obs.call ('TriggerMediaInputAction', {
            inputName: 'TTS Audio',
            mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY'
        });
    } catch (err) {console.error('Error triggering TTS audio:', err);}

    // Wait for the audio to finish playing
    await new Promise(resolve => setTimeout(resolve, duration + 1)); // Add a buffer of 1ms

    try {
        await obs.call ('RemoveInput', {
            inputName: 'TTS Audio'
        });
    } catch (err) {console.error('Error removing TTS audio source:', err);}

    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for the input to be removed before deleting the file

    fs.unlink(file, (err) => {
        if (err) {console.error('Error deleting TTS audio file:', err);} 
    });
}

module.exports = {
    goldSound,
    purchaseSound,
    ttsRead,
    disconnectOBS
};
