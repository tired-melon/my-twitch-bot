// TODO: Refactor OBS scene edit functions to have a single, modular call

require('dotenv').config();
const OBSWebSocket = require('obs-websocket-js').default;
const obs = new OBSWebSocket();
const fs = require('fs');
const { parseFile } = require('music-metadata');


// === OBS WebSocket Config === //

const obs_host = process.env.OBS_HOST;
const obs_password = process.env.OBS_PASSWORD;

// Sneaking in canvas size constants
const CANVASWIDTH = 2560;
const CANVASHEIGHT = 1369;

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

function disconnectOBS() {
    obs.disconnect();
    console.log('Disconnected from OBS WebSocket');
}

// === OBS Alert Handler Class === //

class AlertEvent{
    constructor(event, eventType) {
        this.event = event;
        this.type = eventType;
    }

    get eventUserName() {
        let user;
        switch (this.type) {
            case "Follow", "Sub", "Bit":
                user = this.event.userDisplayName;
            case "Raid":
                user = this.event.raidingBroadcasterDisplayName;
            case "Gift":
                user = this.event.isAnonymous ? 'Anon' : this.event.gifterDisplayName;
            default:
                console.error("[ERROR] Alert Name Switch Statement Failed!");
                text = "melon screwed this up lol"
                break;
        }
        return user;
    }

    get eventText() {
        let text;
        switch (this.type) {
            case "Follow":
                text = "just joined the Horde!";
            case "Raid":
                text = `just raided with a party of ${this.event.viewers}`;
            case "Bit": 
                text = `just cheered ${this.event.bits} bits!`
            case "Sub":
                text = "just subscribed!"
            case "Gift":
                text = `just gifted ${this.event.amount} sub${this.event.amount > 1 ? "s" : ""} to the community!`
            default:
                console.error("[ERROR] Alert Text Switch Statement Failed!");
                text = "melon screwed this up lol"
                break;
        }
        return text;
    }
     
    async setup() {
        const duration = 15000; // in ms
        const { currentProgramSceneName } = (await obs.call('GetCurrentProgramScene'));
        const alertNameID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Name'})).sceneItemId;
        const alertTextID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Text'})).sceneItemId;
        const gifID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: `${eventType} Gif`})).sceneItemId; 

        // Dimensions
        const posX = CANVASWIDTH / 2; 
        const posY = CANVASHEIGHT / 2;

        return {duration, currentProgramSceneName, alertNameID, alertTextID, gifID, posX, posY};
    }

    setupParams = this.setup();

    async playback(setup=this.setupParams) {

        // Variables //
        let { duration, currentProgramSceneName, alertNameID, alertTextID, gifID,posX, posY } = (await setup); 
        
        try {

            // Sound & Setup //
            await obs.call('TriggerMediaInputAction', { // Play relevant sound
                sceneName: currentProgramSceneName,
                inputName: `${this.type} Sound`,
                mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
            });
            await obs.call('SetInputSettings', { // Change alert name text
                sceneName: currentProgramSceneName,
                inputName: 'Alert Name',
                inputSettings: {'text': this.eventUserName},
                overlay: true
            });
            await obs.call('SetInputSettings', { // Change rest of alert text
                sceneName: currentProgramSceneName,
                inputName: 'Alert Text',
                inputSettings: {'text': this.eventText},
                overlay: true
            });
            await obs.call('SetSceneItemTransform', { // Center name text
                sceneName: currentProgramSceneName,
                sceneItemId: alertNameID,
                sceneItemTransform:{
                    positionX: posX,
                    positionY: posY,
                    alignment: 0,
                    boundsType: 'OBS_BOUNDS_NONE',
                    boundsAlignment: 0
                }
            });
            await obs.call('SetSceneItemTransform', { // Center rest of text under name text
                sceneName: currentProgramSceneName,
                sceneItemId: alertTextID,
                sceneItemTransform:{
                    positionX: posX,
                    positionY: posY + 134,
                    alignment: 0,
                    boundsType: 'OBS_BOUNDS_NONE',
                    boundsAlignment: 0
                }
            });

        // Display //
        await obs.call('SetSceneItemEnabled', { // Enable gif
            sceneName: currentProgramSceneName,
            sceneItemId: gifID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable rest of alert text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: true
        });

        // Wait for audio to end //
        await new Promise(r => setTimeout(r, duration));

        // Hide //
        await obs.call('SetSceneItemEnabled', { // Disable rest of alert text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Disable name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Disable gif
            sceneName: currentProgramSceneName,
            sceneItemId: gifID,
            sceneItemEnabled: false
        });
        await new Promise(r => setTimeout(r, 901)); // Safety delay for fade

        } catch(e) {
            console.error(`Error with ${this.eventType} Alert: `, e);
        } 
    }
}

// === Isolated Sound Events === //

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

async function ttsRead(file) {
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    const metadata = await parseFile(file);
    const duration = (metadata.format.duration * 1000) || 5000; // Convert to milliseconds
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
    
    try {
        // Set the audio monitor type to monitor and output
        // This allows the audio to be played through OBS and heard by the streamer

        await obs.call('SetInputAudioMonitorType', {
            inputName: 'TTS Audio',
            monitorType: 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT'
        });
    } catch (err) { console.error('Error setting audio monitor type:', err); }

    // Wait for the input to be created
    await new Promise(r => setTimeout(r, 2000)); 

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

// === ALERT QUEUE SYSTEM === //

const alertQueue = [];
let isAlertPlaying = false;

async function addToAlertQueue(event, alertType) {
    alertQueue.unshift({event, alertType});
    processAlertQueue();
    return;
}

async function processAlertQueue() {
    if (isAlertPlaying || alertQueue.length === 0) return; // already running or nothing to do
    isAlertPlaying = true;

    const alert = alertQueue.pop();

    const alertEvent = new AlertEvent(alert.event, alert.alertType);

    try {
        alertEvent.playback() // waits until playback ends
    } catch (err) {
        console.error('Error during Alert playback:', err);
    } finally {
        isAlertPlaying = false;
        processAlertQueue(); // process the next item
    }
}

// === OBS ALERT HANDLERS === //
/* *** DEPRECIATED ALERT SYSTEM, COMMENTED FOR TEMP REFERENCE ***
// Raid Alert
async function raidAlert(raider, size) { // Good Framework for generic event handler, will refactor later
    const duration = 15000; // in ms
    const { currentProgramSceneName } = (await obs.call('GetCurrentProgramScene'));
    const alertNameID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Name'})).sceneItemId;
    const alertTextID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Text'})).sceneItemId;
    const raidGifID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Raid Gif'})).sceneItemId;


    // Dimensions
    const canvasWidth = 2560;
    const canvasHeight = 1369;
    const posX = canvasWidth / 2; 
    const posY = canvasHeight / 2;
    try {
        await obs.call('TriggerMediaInputAction', { // Play raid sound
            sceneName: currentProgramSceneName,
            inputName: 'Raid Sound',
            mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
        });
        await obs.call('SetInputSettings', { // Change raid name text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Name',
            inputSettings: {'text': raider},
            overlay: true
        });
        await obs.call('SetInputSettings', { // Change rest of raid text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Text',
            inputSettings: {'text': `just raided with a party of ${size}!`},
            overlay: true
        })
        await obs.call('SetSceneItemTransform', { // Center name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });
        await obs.call('SetSceneItemTransform', { // Center rest of text under name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY + 134,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });

        // Display stuff
        await obs.call('SetSceneItemEnabled', { // Enable raid gif
            sceneName: currentProgramSceneName,
            sceneItemId: raidGifID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable rest of raid text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: true
        });

        // Wait for audio to end
        await new Promise(r => setTimeout(r, duration));

        // Hide stuff
        await obs.call('SetSceneItemEnabled', { // Disable rest of raid text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Disable raid name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Disable raid gif
            sceneName: currentProgramSceneName,
            sceneItemId: raidGifID,
            sceneItemEnabled: false
        });
        await new Promise(r => setTimeout(r, 901)); // Making sure stuff fades all the way first
    } catch(e) {
        console.error('Error with Raid Alert: ', e);
    }
    console.log(`[SUCCESS] Raid Alert Played!`);
};

// Gift Subs
async function giftAlert(gifter, amount) { // Good Framework for generic event handler, will refactor later
    const duration = 8000; // in ms
    const { currentProgramSceneName } = (await obs.call('GetCurrentProgramScene'));
    const alertNameID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Name'})).sceneItemId;
    const alertTextID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Text'})).sceneItemId;
    const subGifID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Sub Gif'})).sceneItemId;


    // Dimensions
    const canvasWidth = 2560;
    const canvasHeight = 1369;
    const posX = canvasWidth / 2; 
    const posY = canvasHeight / 2;
    try {
        await obs.call('TriggerMediaInputAction', { // Play raid sound
            sceneName: currentProgramSceneName,
            inputName: 'Sub Sound',
            mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
        });
        await obs.call('SetInputSettings', { // Change alert name text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Name',
            inputSettings: {'text': gifter},
            overlay: true
        });
        await obs.call('SetInputSettings', { // Change rest of alert text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Text',
            inputSettings: {'text': `just gifted ${amount} sub${amount > 1 ? 's' : ''}!`},
            overlay: true
        })
        await obs.call('SetSceneItemTransform', { // Center name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });
        await obs.call('SetSceneItemTransform', { // Center other text under name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY + 134,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });


        // Display stuff
        await obs.call('SetSceneItemEnabled', { // Enable sub gif
            sceneName: currentProgramSceneName,
            sceneItemId: subGifID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable alert name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable rest of alert text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: true
        });

        // Wait for audio to end
        await new Promise(r => setTimeout(r, duration));

        // Hide stuff
        await obs.call('SetSceneItemEnabled', { // Enable rest of raid text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid gif
            sceneName: currentProgramSceneName,
            sceneItemId: subGifID,
            sceneItemEnabled: false
        });
        await new Promise(r => setTimeout(r, 901)); // Making sure stuff fades all the way first
    } catch(e) {
        console.error('Error with Gift Sub Alert: ', e);
    }
    console.log(`[SUCCESS] Gift Sub Alert Played!`);
};

// Follow
async function followAlert(follower) {
    const duration = 8000; // in ms
    const { currentProgramSceneName } = (await obs.call('GetCurrentProgramScene'));
    const alertNameID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Name'})).sceneItemId;
    const alertTextID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Text'})).sceneItemId;
    const followGifID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Follow Gif'})).sceneItemId;


    // Dimensions
    const canvasWidth = 2560;
    const canvasHeight = 1369;
    const posX = canvasWidth / 2; 
    const posY = canvasHeight / 2;
    try {
        await obs.call('TriggerMediaInputAction', { // Play raid sound
            sceneName: currentProgramSceneName,
            inputName: 'Follow Sound',
            mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
        });
        await obs.call('SetInputSettings', { // Change alert name text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Name',
            inputSettings: {'text': follower},
            overlay: true
        });
        await obs.call('SetInputSettings', { // Change rest of alert text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Text',
            inputSettings: {'text': `just joined the Horde!`},
            overlay: true
        })
        await obs.call('SetSceneItemTransform', { // Center name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });
        await obs.call('SetSceneItemTransform', { // Center other text under name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY + 134,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });


        // Display stuff
        await obs.call('SetSceneItemEnabled', { // Enable follow gif
            sceneName: currentProgramSceneName,
            sceneItemId: followGifID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable alert name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable rest of alert text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: true
        });

        // Wait for audio to end
        await new Promise(r => setTimeout(r, duration));

        // Hide stuff
        await obs.call('SetSceneItemEnabled', { // Enable rest of raid text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid gif
            sceneName: currentProgramSceneName,
            sceneItemId: followGifID,
            sceneItemEnabled: false
        });
        await new Promise(r => setTimeout(r, 901)); // Making sure stuff fades all the way first
    } catch(e) {
        console.error('Error with Follow Alert: ', e);
    }
    console.log(`[SUCCESS] Follow Alert Played!`);
};

// Subscription
async function subAlert(subscriber) {
    const duration = 8000; // in ms
    const { currentProgramSceneName } = (await obs.call('GetCurrentProgramScene'));
    const alertNameID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Name'})).sceneItemId;
    const alertTextID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Text'})).sceneItemId;
    const subGifID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Sub Gif'})).sceneItemId;


    // Dimensions
    const canvasWidth = 2560;
    const canvasHeight = 1369;
    const posX = canvasWidth / 2; 
    const posY = canvasHeight / 2;
    try {
        await obs.call('TriggerMediaInputAction', { // Play raid sound
            sceneName: currentProgramSceneName,
            inputName: 'Sub Sound',
            mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
        });
        await obs.call('SetInputSettings', { // Change alert name text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Name',
            inputSettings: {'text': subscriber},
            overlay: true
        });
        await obs.call('SetInputSettings', { // Change rest of alert text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Text',
            inputSettings: {'text': `just subscribed!`},
            overlay: true
        })
        await obs.call('SetSceneItemTransform', { // Center name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });
        await obs.call('SetSceneItemTransform', { // Center other text under name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY + 134,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });


        // Display stuff
        await obs.call('SetSceneItemEnabled', { // Enable sub gif
            sceneName: currentProgramSceneName,
            sceneItemId: subGifID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable alert name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable rest of alert text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: true
        });

        // Wait for audio to end
        await new Promise(r => setTimeout(r, duration));

        // Hide stuff
        await obs.call('SetSceneItemEnabled', { // Enable rest of raid text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid gif
            sceneName: currentProgramSceneName,
            sceneItemId: subGifID,
            sceneItemEnabled: false
        });
        await new Promise(r => setTimeout(r, 901)); // Making sure stuff fades all the way first
    } catch(e) {
        console.error('Error with Sub Alert: ', e);
    }
    console.log(`[SUCCESS] Sub Alert Played!`);
};

// Bits
async function bitAlert(gifter, amount) {
    const duration = 3000; // in ms
    const { currentProgramSceneName } = (await obs.call('GetCurrentProgramScene'));
    const alertNameID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Name'})).sceneItemId;
    const alertTextID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Alert Text'})).sceneItemId;
    const bitGifID = (await obs.call('GetSceneItemId', {sceneName: currentProgramSceneName, sourceName: 'Bit Gif'})).sceneItemId;


    // Dimensions
    const canvasWidth = 2560;
    const canvasHeight = 1369;
    const posX = canvasWidth / 2; 
    const posY = canvasHeight / 2;
    try {
        await obs.call('TriggerMediaInputAction', { // Play raid sound
            sceneName: currentProgramSceneName,
            inputName: 'Bit Sound',
            mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
        });
        await obs.call('SetInputSettings', { // Change alert name text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Name',
            inputSettings: {'text': gifter},
            overlay: true
        });
        await obs.call('SetInputSettings', { // Change rest of alert text
            sceneName: currentProgramSceneName,
            inputName: 'Alert Text',
            inputSettings: {'text': `just cheered ${amount} bit${amount > 1 ? 's' : ''}`},
            overlay: true
        })
        await obs.call('SetSceneItemTransform', { // Center name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });
        await obs.call('SetSceneItemTransform', { // Center other text under name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemTransform:{
                positionX: posX,
                positionY: posY + 134,
                alignment: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                boundsAlignment: 0
            }
        });


        // Display stuff
        await obs.call('SetSceneItemEnabled', { // Enable sub gif
            sceneName: currentProgramSceneName,
            sceneItemId: bitGifID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable alert name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: true
        });
        await obs.call('SetSceneItemEnabled', { // Enable rest of alert text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: true
        });

        // Wait for audio to end
        await new Promise(r => setTimeout(r, duration));

        // Hide stuff
        await obs.call('SetSceneItemEnabled', { // Enable rest of raid text
            sceneName: currentProgramSceneName,
            sceneItemId: alertTextID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid name text
            sceneName: currentProgramSceneName,
            sceneItemId: alertNameID,
            sceneItemEnabled: false
        });
        await obs.call('SetSceneItemEnabled', { // Enable raid gif
            sceneName: currentProgramSceneName,
            sceneItemId: bitGifID,
            sceneItemEnabled: false
        });
        await new Promise(r => setTimeout(r, 901)); // Making sure stuff fades all the way first
    } catch(e) {
        console.error('Error with Bit Alert: ', e);
    }
    console.log(`[SUCCESS] Bit Alert Played!`);
};
*/

module.exports = {
    goldSound,
    purchaseSound,
    ttsRead,
    disconnectOBS,
    addToAlertQueue
};