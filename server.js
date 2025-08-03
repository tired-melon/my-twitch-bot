// TODO: Figure out how to make shop work with the Twitch API, Implement test and Special Stream settings, Add lifetime gold stat under users, Begin adding Python Codebase for LLM Integration; we're giving the bot a brain :D

// STREAM-RELATED SETTINGS //
// Change these by hand to edit the interval of events
let isSpecialStream = false; // Set to true if this is a special stream, like a charity stream, event, or a subathon
let isTesting = false; // Set to true if you are testing the bot, this will change some functionalities

const { StaticAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { EventSubWsListener } = require('@twurple/eventsub-ws');
const gTTS = require('gtts');
const { writeFileSync } = require('fs');
const path = require('path');
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
const { dailyGold, goldRank, goldTop, wallet, shopDescriptionObject, distributeGold } = require('./redeems.js');
const { shopDescription, shopInventory, vipCheck, purchaseItem } = require('./shop.js');
const { goldSound, ttsRead, disconnectOBS } = require('./obs_functions.js');
const { addToQueue, processTTSQueue, isPlaying, ttsQueue } = require('./tts_system.js');
const { Channel } = require('twitch');

// Command Regex
const regexpCommand = new RegExp(/!([a-zA-Z0-9]+)/g);

// Commands that don't depend on messages
const asyncCommandLib = {
    socials: {
        response: "Wanna know what melon will do next? Stay updated with melon's social media accounts! Bluesky: https://bsky.app/profile/tired-melon.bsky.social YouTube: https://www.youtube.com/@tiredMelonYT Instagram: https://www.instagram.com/melon.is.tired/",
    },
    discord: {
        response: "Wanna communicate with the hoard? Join the discord for updates and community events! https://discord.gg/53rtntWnzw",
    },
    follow: {
        response: "If you're having a good time, remember to follow and turn on notifications to see when melon goes live!",
    },
    lurk: {
        response: (user) => `${user} sinks into the abyss of treasure. Thanks for the lurk!`,
    },
    lurking: {
        response: (user) => `${user} sinks into the abyss of treasure. Thanks for the lurk!`,
    },
    ads: {
        response: "Going on an ad break! We have to run 3 minutes of ads every hour, so feel free to use the time to do some self-care! Friendly reminder: Subscribers don't see ads! It's not required by any means, but always appreciated!",
    },
    goldtop: {
        response: () => goldTop(),
    },
    rank: {
        response: (user) => goldRank(user),
    },
    gold: {
        response: (user) => wallet(user),
    },
    goldinfo: {
        response: () => `Gold is a currency that you can earn by participating in the chat and redeeming daily gold. You can use it to buy items in the shop! To view your current gold, use the command !gold.`
    },
    shop: {
        response: shopDescriptionObject,
    },
    buy: {
        response: (user) => purchaseItem(user),
    },
    roll: {
        response: (user) => {
            let roll = (1 + Math.random() * 19).toFixed(0);
            console.log(roll);

            return roll == 20 
            ? `${user} rolls a natural 20! Fortune smiles upon you!`
            : roll == 1
            ? `${user} rolls a natural 1. Ouch...`
            : `${user} rolls a ${roll}!`
        }
    }
}

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
    client.say(`#${streamerName}`, "🪙 It's raining gold! Send a message in chat to catch some! 🪙");
    isRaining = true;
    console.log("[DEBUG] rainingGold Event initiated!");
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

    }, ((3600000 + Math.random() * 900000 - Math.random() * 900000) / (isSpecialStream ? 2 : 1))); // Every hour +/- somewhere between 0-15 minutes

// Listening for messages in chat
client.on('message', (channel, tags, message, self) => {

    
	const isNotBot = tags.username.toLowerCase() !== username;
    if (!isNotBot) return; // Ignore messages from the bot itself
    if (typeof message !== 'string') return; // Juuuuuuust in case, but should always be a string
    if (self) return;

    // Internal logic for raining gold event
    if (isRaining) {
        if (message && !rainCatchers.includes(tags.username) && tags.username !== streamerName.toLowerCase()) {
            rainCatchers.push(tags.username);
            console.log(`[RAIN] ${tags.username} caught some gold!`);
        }
    }
    
    if (message.includes('!pokecatch')) return; // Ignore pokecatch messages, moved to after the raining gold event logic
    

    // Silly chat response commands
    
    if (message.toLowerCase().includes('o7')) {
        client.say(channel, 'o7')
    }

    if (message.toLowerCase().includes('o/')) {
        client.say(channel, 'tiredm21Wave');
    }

    if (message.toLowerCase().includes('gavins8lurk')) {
        client.say(channel, `${tags.username} sinks into the abyss of treasure. Thanks for the lurk!`)
    }

    if (message.toLowerCase() === 'tiredm21Wave') {
        client.say(channel, 'tiredm21Wave');
    }

    if (message.toLowerCase() === 'trenti8wave') {
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

        const {response} = asyncCommandLib[command] || {};

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
            console.log(`[DEBUG] Sending response (function)`);
            client.say(channel, response(tags.username));
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
                    client.say(channel, response.message2), 2000
                    });
                }
                if (response.message3) {
                    setTimeout(() => {
                    client.say(channel, response.message3)
                }), 4000
                }
                if (response.message4) {
                    setTimeout(() => {
                    client.say(channel, response.message4)
                }), 6000
                }
                if (response.message5) {
                    setTimeout(() => {
                    client.say(channel, response.message5)
                }), 8000
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

async function start() {

  await listener.start();

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
        }
    
    // TTS

        if (event.rewardTitle === 'TTS!') {
            const ttsSpeech = event.input;
            const fileName = path.resolve(`${event.userDisplayName}_${Date.now()}.mp3`);
            const gtts = new gTTS(ttsSpeech, 'en');
            
            gtts.save(fileName, function(err, result) {
                if(err) { throw new Error(err); }
                addToQueue(fileName); // Add the file to the TTS queue
                console.log(`[DEBUG] TTS conversion successful! File saved as ${fileName}`);
            });
        }
    });
    console.log('✅ EventSub listener started successfully!');
    console.log('✅ Listening for channel point redemptions...');

}

start().catch(console.error);

