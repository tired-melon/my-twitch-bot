// TO FIX: Tokens send as an entire string rather than individual elements, will use twurple's parseTwitchMessage (or parseChatMessage idk).


// STREAM-RELATED SETTINGS //
// Change these by hand to edit the interval of events
let isSpecialStream = true; // Set to true if this is a special stream, like a charity stream, event, or a subathon
let isTesting = false; // Set to true if you are testing the bot, this will change some functionalities

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
require('dotenv').config();

const tmi = require('tmi.js');

const accessToken = process.env.BOT_OAUTH_TOKEN;
const username = process.env.BOT_USERNAME; 
const streamerName = process.env.CHANNEL;
const clientId = process.env.STREAMER_CLIENT_ID;
const streamerAccessToken = process.env.STREAMER_OAUTH_TOKEN;
const userId = process.env.STREAMER_USER_ID;

const authProvider = new StaticAuthProvider(clientId, streamerAccessToken);
const apiClient = new ApiClient({ authProvider });
const listener = new EventSubWsListener({ apiClient });

// Importing other useful commands
const { buildChatTokens, convertTmiEmotes } = require('./services/chatTokens.js');
const { dailyGold, goldRank, goldTop, wallet, distributeGold } = require('./redeems.js');
const { purchaseItem, shopDescriptionObject } = require('./shop.js');
const { goldSound, disconnectOBS, purchaseSound, addToAlertQueue } = require('./services/obsClient.js');
const { addToTTSQueue } = require('./services/ttsService.js');
const { getProfilePic } = require('./services/twitchUsers.js');
const { betterRandom } = require('./testing.js'); // Hidden module, contains improved random function among other functions to be tested

// Command Regex
const regexpCommand = new RegExp(/!([a-zA-Z0-9]+)/g);

// Commands that don't depend on messages
const commands = require('./commands.js');

// Array of commands with authority reqs
// Less for utility and more for reference
// specialCommands = ['so', 'ads', 'raid'];

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

// Broadcast helper function
function broadcast(data) {
    const json = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

// === TEST CHAT SYSTEM === //
if (isTesting) {
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
}
server.listen(3000, () => {console.log('Overlay server running on localhost')});

client.connect();
// Running timed follow message
setInterval(() => {client.say(`#${streamerName}`, "If you're having a good time, remember to follow and turn on notifications to see when melon goes live!")}, 900000);

// ==========FLAGS AND QUEUES========== //   
// Beginning of raining gold event implementation
let isRaining = false; // initial state for raining gold
let rainCatchers = []; // Array to hold users who catch gold during the event
// TEST EVENT: Raining Gold //
// Uncomment to test the raining gold event //

/*
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

    isRaining = false; // Stop the raining gold event
    rainCatchers = []; // Reset the catchers for the next event
}, 30000); // Raining gold lasts for 30 seconds

*/
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

        isRaining = false; // Stop the raining gold event
        rainCatchers = []; // Reset the catchers for the next event
        console.log("[DEBUG] Raining gold event ended.");
    }, 60000); // Raining gold lasts for 60 seconds
    }, (betterRandom(4500000, 2700000) / (isSpecialStream ? 2 : 1))); // Every hour +/- somewhere between 0-15 minutes

// Listening for messages in chat
client.on('message', async (channel, tags, message, self) => {
    if (self) return;

    let profilePicUrl = await getProfilePic(apiClient, tags['user-id']);

    const tokens = message // TODO: Tokenize message later

    let messageData = {
        type: 'chat',
        username: tags['display-name'] || tags['username'],
        title: tags.badges?.vip ? 'VIP' : '',
        profilePic: profilePicUrl,
        tokens: tokens
    };
    
    try{
        broadcast(messageData);
    } catch(e){
        console.error('Error with Broadcasting Message Data: ', e);
    }
    console.log(`code run for broadcast. Data: ${JSON.stringify(messageData)}`);

    // Internal logic for raining gold event
    if (isRaining) {
        if (message && !rainCatchers.includes(tags.username) && tags.username !== streamerName.toLowerCase()) {
            rainCatchers.push(tags.username);
            console.log(`[RAIN] ${tags.username} caught some gold!`);
        }
    }
    
    if (message.includes('!pokecatch')) return; // Ignore pokecatch messages, moved to after the raining gold event logic
    

    // Silly chat response commands
    
    const friendWaves = ['trenti8wave', 'gavins8wave', 'tiredm21wave'];
    const friendLurks = ['daitan2KodiLurk', 'gavins8lurk'];
    
    if (message.toLowerCase().includes('o7')) {
        client.say(channel, 'o7')
    }

    if (message.toLowerCase().includes('o/')) {
        client.say(channel, 'tiredm21Wave');
    }

    if (friendLurks.includes(message.toLowerCase())) {
        client.say(channel, `${tags.username} sinks into the abyss of treasure. Thanks for the lurk!`)
    }

    if (friendWaves.includes(message.toLowerCase())) {
        client.say(channel, 'tiredm21Wave');
    }

    if (message.toLowerCase().includes("ffxiv") ||
        message.toLowerCase().includes("ff14") ||
        message.toLowerCase().includes("final fantasy 14")) {
        client.say(channel, 
            'The critically acclaimed MMORPG Final Fantasy XIV? With an expanded free trial which you can play through the entirety of A Realm Reborn and the award-winning Heavensward and Stormblood expansions up to level 70 for free with no restrictions on playtime?')
    }

    // 'Goodnight' message command
    if (message.toLowerCase().includes(`goodnight ${username}`) &&
        tags.username === streamerName.toLowerCase()) {
            client.say(channel, `Goodnight! tiredm21Wave`);
            disconnectOBS();
            client.disconnect();
            console.log(`${username} is now napping until needed again!`)
            process.exit(0);
    }

    // Logic for proper ! commands

    const matches = message.match(regexpCommand);

    if (!matches) return;
    console.log(`[DEBUG] Found matches:`, matches);


    for (const match of matches) {
        
        //Detecting matches
        if (!match) continue;
        const args = message.split(' ');
        const command = match.toLowerCase().slice(1);
        console.log(`[DEBUG] Listing arguments: ${args}`);
        console.log(`[DEBUG] Processing command: ${command}`);
        console.log(`[DEBUG] Command type (should be string): ${typeof command}`);

        const {response} = commands[command] || {};

        // Authority check

        if (tags.mod || tags.username === streamerName.toLowerCase()) {
            console.log(`[DEBUG] User with auth in chat. Command: ${command}`);

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

            // Raid Message
            if (command === 'raid') {
                client.say(channel, "tiredm21LETSGO Mimic Raid! tiredm21LETSGO Mimic Raid! tiredm21LETSGO");
                return
            }

            // Ads Command
            if (command === 'ads') {
                client.say(channel, response);
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
            };
        }
        // Rest of commands

        if (typeof response === 'function') {
            if (command === 'buy') { // Checking for !buy
                console.log(`[DEBUG] ${tags.username} is attempting to buy ${args.slice(1).join(' ')}`)
                client.say(channel, `${purchaseItem(tags.username, args)}`);
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
                client.say(channel, response.message1);
                console.log(`[DEBUG] Sent message1: ${response.message1}`);
                if (response.message2) {
                    setTimeout(() => {
                    client.say(channel, response.message2)
                    }, 2000);
                }
                if (response.message3) {
                    setTimeout(() => {
                    client.say(channel, response.message3)
                    }, 4000)
                }
                if (response.message4) {
                    setTimeout(() => {
                    client.say(channel, response.message4)
                    }, 6000)
                }
                if (response.message5) {
                    setTimeout(() => {
                    client.say(channel, response.message5)
                    }, 8000)
                }
                
            } catch (err) {
                console.error('[ERROR] Failed to send object response', err);
            }
        } else {
            console.log(`[DEBUG] Response not found for command: ${command}`);
            console.log(`[DEBUG] Response is of type ${typeof response}`);
        }
    }
});

// Gift sub variables outside the scope of an async
let amount = 1;
let gifter = ''

async function start() {

  await listener.start();

    // === CHANNEL REDEEMS === //
    listener.onChannelRedemptionAdd(userId, event => {
        console.log(`[✅ Redeemed] ${event.userDisplayName} used ${event.rewardTitle}`);

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

        addToAlertQueue(relevantUser1 = follower, relevantUser2 = undefined, num1 = amount, num2 = undefined, alertType = 'follow');
    })

    // Raid
    listener.onChannelRaidTo(userId, event => {
        const raiderName = event.raidingBroadcasterDisplayName;
        const raidSize = event.viewers;
        console.log("[DEBUG] Raided!");

        addToAlertQueue(relevantUser1 = raiderName, relevantUser2 = undefined, num1 = raidSize, num2 = undefined, alertType = 'raid');
    }); 


    // Gift Sub Flags
    listener.onChannelSubscriptionGift(userId, event => {
        amount = event.amount;
        gifter = event.isAnonymous ? 'Anon' : event.gifterDisplayName;
    });

    // Subscription
    listener.onChannelSubscription(userId, event => {
        const subscriber = event.userDisplayName;
        console.log("[DEBUG] Sub received!");

        if (event.isGift) {
            addToAlertQueue(relevantUser1 = gifter, relevantUser2 = undefined, num1 = amount, num2 = undefined, alertType = 'gift');
            console.log("Current Gifter: ", gifter);

            return;
        } else {
            addToAlertQueue(relevantUser1 = subscriber, relevantUser2 = undefined, num1 = undefined, num2 = undefined, alertType = 'sub');
        }

    })

    // Bits
    listener.onChannelCheer(userId, event => {
        const gifter = event.userDisplayName;
        const numBits = event.bits;
        console.log("[DEBUG] Bits received!");

        addToAlertQueue(relevantUser1 = gifter, relevantUser2 = undefined, num1 = numBits, num2 = undefined, alertType = 'bits');
    });

    console.log('✅ EventSub listener started successfully!');
    console.log('✅ Listening for events...');


}

start().catch(console.error);

async function alertRollCall() {
    await new Promise(r => setTimeout(r, 3000));
    // === THROW ASYNC TEST FUNCTIONS HERE === //
    addToAlertQueue("testyman", undefined, 42, undefined, 'gift');
    addToAlertQueue("yeahboiii", undefined, 12, undefined, 'raid');
    addToAlertQueue("im a sub", undefined, undefined, undefined, 'sub');
    addToAlertQueue("bitpusher", undefined, 69, undefined, 'bits');
    addToAlertQueue("evil larry", undefined, undefined, undefined, 'follow');
}

if (isTesting) {
    alertRollCall();
}