const { goldTop, goldRank, wallet } = require('./redeems');
const { shopDescriptionObject } = require('./shop');
const { betterRandom } = require('./betterRandom');

// Command Regex
const regexpCommand = new RegExp(/!([a-zA-Z0-9]+)/g);

// Custom Command Library

const commands = {

    // Promo chat commands
    
    discord: {
        response: "Wanna communicate with the hoard? Join the discord for updates and community events! https://discord.gg/53rtntWnzw",
    },
    follow: {
        response: "If you're having a good time, remember to follow and turn on notifications to see when melon goes live!",
    },
    socials: {
        response: "Wanna know what melon will do next? Stay updated with melon's social media accounts! Bluesky: https://bsky.app/profile/tired-melon.bsky.social YouTube: https://www.youtube.com/@tiredMelonYT Instagram: https://www.instagram.com/melon.is.tired/",
    },

    // Generic chat commands

    ads: {
        response: "Going on an ad break! We have to run 3 minutes of ads every hour, so feel free to use the time to do some self-care! Friendly reminder: Subscribers don't see ads! It's not required by any means, but always appreciated!",
    },
    lurk: {
        response: (user) => `${user} sinks into the abyss of treasure. Thanks for the lurk!`,
    },
    lurking: {
        response: (user) => `${user} sinks into the abyss of treasure. Thanks for the lurk!`,
    },
    raid: {
        response: "tiredm21LETSGO Mimic Raid! tiredm21LETSGO Mimic Raid! tiredm21LETSGO",
    },

    // Shop-related commands

    gold: {
        response: (user) => wallet(user),
    },
    goldinfo: {
        response: () => `Gold is a currency that you can earn by participating in the chat and redeeming daily gold. You can use it to buy items in the shop! To view your current gold, use the command !gold.`
    },
    goldtop: {
        response: () => goldTop(),
    },
    rank: {
        response: (user) => goldRank(user),
    },
    shop: {
        response: shopDescriptionObject,
    },

    // Miscellaneous fun commands

    roll: {
        response: (user) => {
            let roll = betterRandom(20, 1);
            console.log(roll);

            return roll == 20 
            ? `${user} rolls a natural 20! Fortune smiles upon you!`
            : roll == 1
            ? `${user} rolls a natural 1. Ouch...`
            : `${user} rolls a ${roll}!`
        }
    }
};

module.exports = { commands, regexpCommand };
