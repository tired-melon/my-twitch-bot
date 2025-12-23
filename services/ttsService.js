// ===== TTS SYSTEM =====
/*
* This file contains supplementary functions, classes, and variables for the TTS system.
* It houses TTS voice banks, TTS helper functions, and other TTS-related code.
*/

const { ttsRead } = require('./obsClient.js')

const ttsQueue = []; // Queue for TTS audio files
let isPlaying = false; // Flag to check if TTS is currently playing

async function processTTSQueue() {
    if (isPlaying || ttsQueue.length === 0) return; // already running or nothing to do
    isPlaying = true;

    const file = ttsQueue.pop();
    try {
        await ttsRead(file); // waits until playback ends
    } catch (err) {
        console.error('Error during TTS playback:', err);
    } finally {
        isPlaying = false;
        processTTSQueue(); // process the next item
    }
}

function addToTTSQueue(file) {
    ttsQueue.push(file);
    processTTSQueue();
}

module.exports = {
    addToTTSQueue
};