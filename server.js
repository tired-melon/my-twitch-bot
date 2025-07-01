// TODO: Test TTS, start LLM Integration process (probably switching to python for that codebase)

const { StaticAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { EventSubWsListener } = require('@twurple/eventsub-ws');
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
const { dailyGold, goldRank, goldTop } = require('./redeems.js');

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

client.on('message', (channel, tags, message, self) => {

    
	const isNotBot = tags.username.toLowerCase() !== username;
    if (!isNotBot) return;
    if (typeof message !== 'string') return;
    if (self) return;

    console.log(`[DEBUG] Received message: ${message}`);
    // Silly chat response commands
    
    if (message.toLowerCase().includes('o7')) {
        client.say(channel, 'o7')
    }

    if (message.toLowerCase().includes('o/')) {
        client.say(channel, 'tiredm21Wave');
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
        };

        // Rest of commands

        if (typeof response === 'function') {
            console.log(`[DEBUG] Sending response (function)`);
            client.say(channel, response(tags.username));
        } else if (typeof response === 'string') {
            console.log(`[DEBUG] Sending response (string)`)
            client.say(channel, response);
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
        client.say(`#${streamerName}`, `Thank you @${event.userDisplayName} for redeeming your daily gold! You've collected ${newCount ? newCount : 1} gold so far. Enjoy!`);
        }

    // Hello
            if (event.rewardTitle === 'Hello!') {
                client.say(`#${streamerName}`, 'Hello! tiredm21Wave');
            }
        });
    console.log('✅ EventSub listener started successfully!');
  console.log('✅ Listening for channel point redemptions...');
}

start().catch(console.error);

/*
* Commented out obsolete code from PubSub integration
* This is now replaced with EventSub for better reliability and performance.
async function startPubSub() {

    // Redeems! This function starts PubSub and handles redeem logic

    try {
        console.log('[INIT] PubSub initialized!');
        
        // Redeem Handler
        await pubSubClient.onRedemption(userId, (message) => {
            console.log(`[REDEEM] ${message.userDisplayName} redeemed: ${message.rewardTitle}`);

            // Daily Gold
            if (message.rewardTitle === 'Daily Gold') {
                const newCount = dailyGold(message.userDisplayName);
                client.say(`#${streamerName}`, `Thank you @${message.userDisplayName} for redeeming your daily gold! You've collected ${newCount ? newCount : 1} gold so far. Enjoy!`);
            }

            // Hello
            if (message.rewardTitle === 'Hello!') {
                client.say(`#${streamerName}`, 'Hello! tiredm21Wave');
            }
        });

        console.log('[CHECK] Listening for channel point redemptions...');
        console.log('[PASS] PubSub is connected!');

    } catch (err) {
        console.error('[ERROR] PubSub Error:', err);
    }
}
startPubSub();
*/