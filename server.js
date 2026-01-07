// TO FIX: 
// - Tokens send as an entire string rather than individual elements, will use twurple's parseTwitchMessage (or parseChatMessage idk).
// - Clean up server.js to find what needs to be moved where. I won't let this go public until it doesn't look like a mess.
// - Add inventory/purchase history to user data


// ----------------- STREAM-RELATED SETTINGS ----------------- //

let isSpecialStream = true; // Charity, subathon, debut, etc
let isTesting = false; // Run test function (@ bottom of file)

// ---------------------- .env VARIABLES ----------------------- //

require('dotenv').config();
const accessToken = process.env.BOT_OAUTH_TOKEN;
const username = process.env.BOT_USERNAME; 
const streamerName = process.env.CHANNEL;
const clientId = process.env.STREAMER_CLIENT_ID;
const streamerAccessToken = process.env.STREAMER_OAUTH_TOKEN;
const userId = process.env.STREAMER_USER_ID;

// ----------------------- LOAD DEPENDENCIES ------------------------//

const { StaticAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { EventSubWsListener } = require('@twurple/eventsub-ws');
const { ChatClient, parseTwitchMessage } = require('@twurple/chat');
const gTTS = require('gtts');
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const tmi = require('tmi.js');
const authProvider = new StaticAuthProvider(clientId,
     streamerAccessToken);
const apiClient = new ApiClient({ authProvider });
const listener = new EventSubWsListener({ apiClient });

// --------------------  HELPER FUNCTIONS -------------------- // 

const { dailyGold, distributeGold } = require('./redeems.js');
const { purchaseItem } = require('./shop.js');
const { goldSound, disconnectOBS, purchaseSound,
     addToAlertQueue } = require('./services/obsClient.js');
const { addToTTSQueue } = require('./services/ttsService.js');
const { getProfilePic } = require('./services/twitchUsers.js');
const { betterRandom } = require('./betterRandom.js'); 
const commands = require('./commands.js');

// Command Regex
const regexpCommand = new RegExp(/!([a-zA-Z0-9]+)/g);

// Broadcast helper function
function broadcast(data) {
    const json = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

// ---------- INITIALIZE CLIENT + CHAT OVERLAY ---------- //

const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: username,
		password: accessToken,
	},
	channels: [ streamerName ]
});

// Serve overlay HTML/CSS/JS
app.use(express.static(path.join(__dirname, 'public')));
server.listen(3000, () => {console.log('Overlay server running on localhost')});

client.connect();

// Timed follow message
setInterval(() => {client.say(`#${streamerName}`, 
    commands.follow.response)}, 900000);

// ---------- FLAGS AND GLOBALS ---------- //   

// Beginning of raining gold event implementation //
let isRaining = false; // initial state for raining gold
let rainCatchers = []; // Array to hold users who catch gold during the event

setInterval(() => {
    goldSound();

    setTimeout(() => {
    client.say(`#${streamerName}`, "🪙 It's raining gold! Send a message in chat to catch some! 🪙");
    isRaining = true;
    console.log("[DEBUG] rainingGold Event initiated!");
    }, 5000);

    setTimeout(() => {
        if (rainCatchers.length > 0) {
            distributeGold(rainCatchers);
            client.say(`#${streamerName}`, `Gold has been distributed to: ${rainCatchers.join(', ')}!`);
            console.log(`[DEBUG] Distributed gold to ${rainCatchers.length} users.`);
        } else {
            client.say(`#${streamerName}`, "No one caught any gold this time!");
            console.log("[DEBUG] No users caught gold.");
        }

        isRaining = false;
        rainCatchers = [];
        console.log("[DEBUG] Raining gold event ended.");
    }, 60000); // Raining gold lasts for 60 seconds
    }, (betterRandom(4500000, 2700000) / (isSpecialStream ? 2 : 1))); // Every hour +/- somewhere between 0-15 minutes

// -------------------- TMI CHAT HANDLER -------------------- //

client.on('message', async (channel, tags, message, self) => {
    
    // === MESSAGE IGNORES === //

    if (self) return;
    if (message.includes('!pokecatch')) return;

    // === OBS CHAT OVERLAY INTERACTIONS === //

    let profilePicUrl = await getProfilePic(apiClient, tags['user-id']);

    const tokens = message // TODO: Tokenize message later

    let messageData = {
        type: 'chat',
        username: tags['display-name'] || tags['username'],
        title: tags.badges?.vip ? 'VIP' : '',
        profilePic: profilePicUrl,
        tokens
    };
    
    try{
        broadcast(messageData);
    } catch(e){
        console.error('Error with Broadcasting Message Data: ', e);
    }
    console.log(`code run for broadcast. Data: ${JSON.stringify(messageData)}`);

    // === GOLD RAIN EVENT LOGIC === //
    if (isRaining) {
        if (message && !rainCatchers.includes(tags.username) && tags.username !== streamerName.toLowerCase()) {
            rainCatchers.push(tags.username);
            console.log(`[RAIN] ${tags.username} caught some gold!`);
        }
    }

    // === MISC FUN CHAT RESPONSES === //

    // Quick TODO for later: anonymize emotes for modularity and ease of editing
    // Also add the damn ffxiv copypasta to that file. clean code > funny code
    
    const friendWaves = ['trenti8wave', 'gavins8wave', 'tiredm21wave'];
    const friendLurks = ['daitan2KodiLurk', 'gavins8lurk'];
    
    // Salute back
    if (message.toLowerCase().includes('o7')) client.say(channel, 'o7');

    // Wave back
    if (message.toLowerCase().includes('o/') || friendWaves.includes(message.toLowerCase())) client.say(channel, 'tiredm21Wave');

    // Respond to friends lurking w/ emote
    if (friendLurks.includes(message.toLowerCase())) client.say(channel, `${tags.username} sinks into the abyss of treasure. Thanks for the lurk!`);

    if (message.toLowerCase().includes('ffxiv', 'ff14', 'final fantasy 14')) client.say(channel, 'The critically acclaimed MMORPG Final Fantasy XIV? With an expanded free trial which you can play through the entirety of A Realm Reborn and the award-winning Heavensward and Stormblood expansions up to level 70 for free with no restrictions on playtime?');

    // 'Goodnight' message command to turn off bot from chat
    if (message.toLowerCase().includes(`goodnight ${username}`) &&
        tags.username === streamerName.toLowerCase()) {
            client.say(channel, `Goodnight! tiredm21Wave`);
            disconnectOBS();
            client.disconnect();
            console.log(`${username} is now napping until needed again!`)
            process.exit(0);
    }

    // === COMMAND LOGIC === //

    const matches = message.match(regexpCommand);

    if (!matches) return;
    console.log(`[DEBUG] Found matches:`, matches);


    for (const match of matches) {
        
        // Detecting matches //
        if (!match) continue;
        const args = message.split(' ');
        const command = match.toLowerCase().slice(1);
        console.log(`[DEBUG] Listing arguments: ${args}`);
        console.log(`[DEBUG] Processing command: ${command}`);
        console.log(`[DEBUG] Command type (should be string): ${typeof command}`);

        const {response} = commands[command] || {};

        // Authority check //
        if (tags.mod || tags.username === streamerName.toLowerCase()) {
            console.log(`[DEBUG] User with auth in chat. Command: ${command}`);

            // Generic response mod commands
            if (command.includes('ads', 'raid')) {
                client.say(channel, response);
                return;
            }

            // Shoutout Command
            if (command === 'so') {  
                const targetUser = args[1];
                
                const shoutoutName = targetUser.charAt(0) === '@' ? targetUser.slice(1) : targetUser

                if (!targetUser) {
                    client.say(channel, `@${tags.username}, please provide a username to shout out! (!so Username)`);
                    return;
                }
                client.say(channel, `Shoutout to ${shoutoutName}! Check out their channel at https://twitch.tv/${shoutoutName}`);
                console.log(`[DEBUG] Channel is ${channel} of type ${typeof channel} (should be string)`);
                console.log(`[DEBUG] Sent shoutout for ${shoutoutName}!`);
                return;
            }

            // Test TTS Command
            if (command === 'tts') {
                if (args.length < 2) {
                    client.say(channel, `@${tags.username}, please provide text to convert to speech! (!tts Your text here)`);
                    return;
                }
                const ttsSpeech = args.slice(1).join(' ');
                const fileName = path.resolve(`${tags.username}_${Date.now()}.mp3`);
                const gtts = new gTTS(ttsSpeech, 'en');
                
                gtts.save(fileName, (err) => {
                    if(err) { throw new Error(err); }
                    console.log(`[DEBUG] TTS conversion successful! File saved as ${fileName}`);
                    addToQueue(fileName); // Add the file to the TTS queue
                    console.log(`[DEBUG] Added ${fileName} to TTS queue.`);
                });
                
                return;
            }
        }

        // Rest of commands
        if (typeof response === 'function') {
            if (command === 'buy') { // !buy is a special case
                console.log(`[DEBUG] ${tags.username} is attempting to buy ${args.slice(1).join(' ')}`)
                client.say(channel, `${purchaseItem(tags, args)}`);
                return;
            } else {
                console.log(`[DEBUG] Sending response (function)`);
                client.say(channel, response(tags.username));
            }
        } else if (typeof response === 'string') {
            console.log(`[DEBUG] Sending response (string)`)
            client.say(channel, response);
        } else if (typeof response === 'object') {
            console.log(`[DEBUG] Sending response (object)`);
            try{
                let delay = 2000;
                for (let m in response) {
                    setTimeout(() => {
                        client.say(channel, response[m])
                        }, i);
                    delay += 2000;
                }
            
            } catch (err) {
                console.error('[ERROR] Failed to send object response: ', err);
            }
        } else {
            console.log(`[DEBUG] Response not found for command: ${command}`);
            console.log(`[DEBUG] Response is of type ${typeof response}`);
        }
    }
});

async function start() {

  await listener.start();

    // === CHANNEL REDEEMS === //
    listener.onChannelRedemptionAdd(userId, event => {
        console.log(`[Redeemed] ${event.userDisplayName} used ${event.rewardTitle}`);

    // Daily Gold

        if (event.rewardTitle === 'Daily Gold') {
            const newCount = dailyGold(event.userDisplayName);
            client.say(`#${streamerName}`, `Thank you @${event.userDisplayName} for redeeming your daily gold! You've acquired gold ${newCount[0] ? newCount[0] : 1} times so far and you currently have ${newCount[1] ? newCount[1] : 1} gold in your wallet. Enjoy!`);
        }


    // Hello

        if (event.rewardTitle === 'Hello!') {
            client.say(`#${streamerName}`, 'Hello! tiredm21Wave');
            }
        if (isTesting && event.userName === streamerName) {
            // Add whatever you need to test here
            goldSound();
            purchaseSound();
        }
    
    // TTS

        if (event.rewardTitle === 'TTS!') {
            const ttsSpeech = event.input;
            const fileName = path.resolve(`${event.userDisplayName}_${Date.now()}.mp3`);
            const gtts = new gTTS(ttsSpeech, 'en');
            
            gtts.save(fileName, function(err) {
                if(err) { throw new Error(err); }
                addToTTSQueue(fileName); // Add the file to the TTS queue
                console.log(`[DEBUG] TTS conversion successful! File saved as ${fileName}`);
            });
        }
    });

    // === STREAM ALERTS === /

    // Follow
    listener.onChannelFollow(userId, userId, event => {
        const follower = event.userDisplayName;
        console.log("[DEBUG] New Follower!");

        addToAlertQueue(relevantUser1 = follower, relevantUser2 = undefined, num1 = undefined, num2 = undefined, alertType = 'follow');
    });

    // Raid
    listener.onChannelRaidTo(userId, event => {
        const raiderName = event.raidingBroadcasterDisplayName;
        const raidSize = event.viewers;
        console.log("[DEBUG] Raided!");

        addToAlertQueue(relevantUser1 = raiderName, relevantUser2 = undefined, num1 = raidSize, num2 = undefined, alertType = 'raid');
    }); 


    // Gift Sub
    listener.onChannelSubscriptionGift(userId, event => {
        const subAmount = event.amount;
        const subGifter = event.isAnonymous ? 'Anon' : event.gifterDisplayName;
        console.log("Current Gifter: ", subGifter);

        addToAlertQueue(relevantUser1 = subGifter, relevantUser2 = undefined, num1 = subAmount, num2 = undefined, alertType = 'gift');
    });

    // Subscription
    listener.onChannelSubscription(userId, event => {
        if (event.isGift) { // Code would've just run
            return;
        }
        
        const subscriber = event.userDisplayName;
        console.log("[DEBUG] Sub received!");

        addToAlertQueue(relevantUser1 = subscriber, relevantUser2 = undefined, num1 = undefined, num2 = undefined, alertType = 'sub');
    });

    // Bits
    listener.onChannelCheer(userId, event => {
        const bitGifter = event.userDisplayName;
        const numBits = event.bits;
        console.log("[DEBUG] Bits received!");

        addToAlertQueue(relevantUser1 = bitGifter, relevantUser2 = undefined, num1 = numBits, num2 = undefined, alertType = 'bits');
    });

    console.log('[SUCCESS] EventSub listener started successfully!');
    console.log('Listening for events...');
};

start().catch(console.error);

async function testFunctions() {

    // === TEST REPEAT MESSAGE === //

    setInterval(() => {client.say(`#${streamerName}`, 
        `${streamerName} is in testing mode! Take cover!`)}, 10000);
    await new Promise(r => setTimeout(r, 10000)); // Delay to connect to websockets + send message
    
    // === MESSAGE OVERLAY TEST === //

    setInterval(() => {
        let testTokens = 'This is a test message!'

        broadcast({
            type: 'chat',
            username: 'TestUser',
            title: 'Subscriber',
            profilePic: 'https://picsum.photos/200/300',
            testTokens
        });
        console.log('Message sent to server: ', testTokens);
    }, 3000);

    // === RAIN EVENT TEST FUNCTION === //

    isRaining = true;
    client.say(`#${streamerName}`, "🪙 It's raining gold! Send a message in chat to catch some! 🪙");
    setTimeout(() => {
        if (rainCatchers.length > 0) {
            distributeGold(rainCatchers);
            client.say(`#${streamerName}`, `Gold has been distributed to: ${rainCatchers.join(', ')}!`);
            console.log(`[DEBUG] Distributed gold to ${rainCatchers.length} users.`);
        } else {
            client.say(`#${streamerName}`, "No one caught any gold this time!");
            console.log("[DEBUG] No users caught gold.");
        }
        isRaining = false;
        rainCatchers = [];
    }, 30000); // Raining gold lasts for 30 seconds
    await new Promise(r => setTimeout(r, 5000)); // 5s delay for audio offset

    // === ALERT TEST FUNCTIONS === //

    addToAlertQueue("testyman", undefined, 42, undefined, 'gift');
    addToAlertQueue("yeahboiii", undefined, 12, undefined, 'raid');
    addToAlertQueue("im a sub", undefined, undefined, undefined, 'sub');
    addToAlertQueue("bitpusher", undefined, 69, undefined, 'bits');
    addToAlertQueue("evil larry", undefined, undefined, undefined, 'follow');
};

if (isTesting) testFunctions().catch(console.error)