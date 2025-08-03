// This holds the shop functionality for the Twitch bot, including item management, descriptions, and gold management.
const fs = require('fs'); 
const FILE_PATH = './daily_log.json';
const { purchaseSound } = require('./obs_functions.js');


/* THE SHOP! CHATTERS CAN BUY ITEMS AND SPECIAL COMMANDS USING DAILY GOLD. THIS IS A WORK IN PROGRESS.
*
* Candidate items: Unique Discord role, VIP, Custom chat title, Chat entrance sound, Custom fanfare, New command, Custom lurk/greeting messages
*
* D&D Related items: Cursed item, Blessed item, Curse a player, Bless a player, custom objective?
* 
* D&D items: Cursed dice (2s are 1s), Blessed dice (19s are 20s), Damage boost (roll 1 die tier higher), Damage reduction (roll 1 die tier lower)
*
* Doubles as a to-do list for custom features since many of these will not be auntomated.
*
*/

class Item {
    constructor(name, cost, description, response) {
        this.name = name;
        this.cost = cost; // All placeholders for now, will be replaced with actual gold values later
        this.description = description;
        this.response = response; // This will be a function that returns a response based on the user's input
    }
}

const vipItem = new Item('VIP', 100, 'Grants you VIP status in the chat, allowing you to use special commands and features.', vipCheck);
const discordRoleItem = new Item('Discord Role', 150, 'Grants you a special role in the Discord server, giving you a custom color and title!',
     'Thank you for purchasing! You will need to be manually given this role by a mod or admin.');
const customChatTitleItem = new Item('Custom Chat Title', 200, 'Allows you to set a custom title that will be displayed in the chat.',
     'Thank you for purchasing! You will need to be manually given this title by a mod or admin. This will be automated in the future.');
const customEntranceSoundItem = new Item('Custom Entrance Sound', 250, 'Allows you to set a custom sound that will play when you enter the chat.',
     'Thank you for purchasing! Please contact a mod or admin on discord to add your custom sound. Give 1-2 days to get the sound added, as it will need to be approved first.');
const customFanfareItem = new Item('Custom Fanfare', 300, 'Allows you to set a custom fanfare that will play when you enter the chat.',
     'Thank you for purchasing! Please contact melon on discord to add your custom fanfare. Give 1-2 weeks to get the fanfare added, as it is effectively a mini-commission.');
const customCursedItem = new Item('Cursed Item', 15, 'Allows you to generate a cursed item with a curse of your choosing (pending DM approval).',
     'Thank you for purchasing! Please send a message in chat with your proposed curse. Upon approval, the item will be balanced and made available to players as soon as possible.');
const customBlessedItem = new Item('Blessed Item', 15, 'Allows you to generate a blessed item with a blessing of your choosing (pending DM approval).',
        'Thank you for purchasing! Please send a message in chat with your proposed blessing. Upon approval, the item will be balanced and made available to players as soon as possible.');


const shopInventory = [
    vipItem,
    discordRoleItem,
    customChatTitleItem,
    customEntranceSoundItem,
    customFanfareItem,
    customCursedItem,
    customBlessedItem
];

function shopDescription() {
    return { message1: '🍉 Welcome to the shop! Here you can spend your daily gold on special items and features. Each item has a cost in gold, which you can earn by participating in the chat and redeeming daily gold 🍉',
    message2: "🪙 Here's what we have for sale 🪙",
    message3: `
    ${shopInventory.slice(0,3).map(item => `🪙 ${item.name}: ${item.cost} gold - ${item.description} `).join('')}`,
    message4: shopInventory.slice(3).map(item => `🪙 ${item.name}: ${item.cost} gold - ${item.description}`).join(''),
    message5: 'To view your current gold, use the command !gold. To purchase an item, use the command !buy <item name>. For example: !buy VIP'
    };
}

const shopDescriptionObject = shopDescription();


function vipCheck(username) {
    // This function will check if the user is a VIP as well as check available VIP slots and return a response accordingly.
    // For now, it just returns a placeholder response.
    return `You are a VIP, ${username}! Enjoy your special status in the chat! (please note that this is not automated yet, so you will need to be manually given VIP status by a mod or admin.)`;
}

function purchaseItem(username) {
    const query = message.slice(1).join(' ');

    let data = fs.readFileSync(FILE_PATH, 'utf-8');
    let jsonData = JSON.parse(data);
    let user = jsonData.find(chatter => chatter.name.toLowerCase() === username.toLowerCase());

    for (let item of shopInventory) {

        if (!(query.toLowerCase() === item.name.toLowerCase())){
            continue;
        }
        if (user.wallet < item.cost){ 
            client.say(channel, `You don't have enough gold, ${username}! Have you redeemed your daily gold?`);
            break;
        }
        purchaseSound();
        user.wallet -= item.cost;
        client.say(channel, `${item.response}`);
        console.log(`[SUCCESS] ${item.name} purchased by ${username}!`);
        // Note to self, add stream alert that shows that the user purchased an item

        fs.writeFileSync(FILE_PATH, JSON.stringify(jsonData, null, 4));
    };
    console.log(`[DEBUG] Item not found. Message: ${message}`);
    client.say(channel, `Item not found! Remember, the syntax is "!buy [item]" such as "!buy Cursed Item"`);
}

module.exports = {
    shopDescription,
    shopInventory,
    vipCheck,
    shopDescriptionObject,
    purchaseItem,
    Item
}