require('dotenv').config();

const tmi = require('tmi.js');

const regexpCommand = new RegExp(/!([a-zA-Z0-9]+)/g);

const commands = {
    socials: {
        response: "Wanna know what melon will do next? Stay updated with melon's social media accounts! Bluesky: https://bsky.app/profile/tired-melon.bsky.social YouTube: https://www.youtube.com/@tiredMelonYTInstagram: https://www.instagram.com/melon.is.tired/",
    },
    discord: {
        response: "Wanna communicate with the hoard? Join the discord for updates and community events! https://discord.gg/53rtntWnzw",
    },
    follow: {
        response: "If you're having a good time, remember to follow and turn on notifications to see when melon goes live!",
    },
    ads: {
        response: "Going on an ad break! We have to run 3 minutes of ads every hour, so feel free to use the time to do some self-care! Friendly reminder: Subscribers don't see ads! It's not required by any means, but always appreciated!",
    },
    lurk: {
        response: (user) => `${user} sinks into the abyss of treasure. Thanks for the lurk!`,
    },
    lurking: {
        response: (user) => `${user} sinks into the abyss of treasure. Thanks for the lurk!`,
    }
}

const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: process.env.TWITCH_BOT_USERNAME,
		password: process.env.TWITCH_OAUTH_TOKEN
	},
	channels: [ 'tiredmelon_' ]
});

client.connect();

client.on('message', (channel, tags, message, self) => {
	const isNotBot = tags.username.toLowerCase() !== process.env.TWITCH_BOT_USERNAME
    if (!isNotBot) return;
    if (typeof message !== 'string') return;
    if (self) return;

    console.log(`[DEBUG] Received message: ${message}`);

    const matches = message.match(regexpCommand);

    console.log(`[DEBUG] Found matches:`, matches);

    if (!matches) return;

    for (const match of matches) {
        if (!match) continue;
        const args = message.split(' ');
        const command = match.toLowerCase().slice(1);
        console.log(`[DEBUG] Listing arguments: ${args}`);
        console.log(`[DEBUG] Processing command: ${command}`);
        console.log(`[DEBUG] Command type (should be string): ${typeof command}`);

        // Hard-coding in some special cases
        if(command === 'so') {
            console.log(`[DEBUG] Special case accessed. Command: ${command}`);
            if (tags.mod || tags.username === 'tiredmelon_') {    
                const targetUser = args[1];

                if (!targetUser) {
                    client.say(channel, `@${tags.username}, please provide a username to shout out! (!so Username)`);
                    return;
        
                }

                client.say(channel, `Shoutout to ${targetUser}! Check out their channel at https://twitch.tv/${targetUser}`);
                console.log(`[DEBUG] Sent shoutout for ${targetUser}`);
                return;
            }
            return;
        }

        if (command === 'ad' || 'ads' || 'adbreak' ) {
            console.log(`[DEBUG] Special case accessed. Command: ${command}`);
            if(tags.mod || tags.username === 'tiredmelon_') {
                client.say(channel, `Going on an ad break! We have to run 3 minutes of ads every hour, so feel free to use the time to do some self-care! Friendly reminder: Subscribers don't see ads! It's not required by any means, but always appreciated!`);
                return;
            }
            return;
        }
        

        const {response} = commands[command] || {};

        if (typeof response === 'function') {
            console.log(`[DEBUG] Sending response (function)`)
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