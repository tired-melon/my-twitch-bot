// Holding all the redeem functions (and the shop) here so I don't have to throw them all in a singular massive function
const fs = require('fs'); 
const FILE_PATH = './daily_log.json';

function dailyGold(username) {
    console.log(`${username} redeemed their daily gold!`);
    try {
        distributeGold([username]); // Distribute gold to the user
        let data = fs.readFileSync(FILE_PATH, 'utf-8');
        let jsonData = JSON.parse(data);

        let updatedUser = jsonData.find(chatter => chatter.name.toLowerCase() === username.toLowerCase());
        console.log(`[SUCCESS] Daily Gold reedemed by ${username}`);
        console.log(`[DEBUG] User current redeems: ${updatedUser.redeems}`);
        console.log(`[DEBUG] User current gold: ${updatedUser.wallet}`);

        return [updatedUser.redeems, updatedUser.wallet];
        
    } catch(err) {
        console.error('[ERROR] Could not update redeems', err);
    }
}

function sortLeaderboard() {
    let data = fs.readFileSync(FILE_PATH, 'utf-8');
    let jsonData = JSON.parse(data);
    return jsonData.sort((a, b) => b.redeems - a.redeems)
}

function goldTop(top = 3) {
    try {
        let lb = sortLeaderboard().slice(0, top);
        console.log(lb);
        let format = lb.map((user, index) => {
            let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
            return `${medal} ${user.name} - ${user.redeems} redeems`;
        });

        return `🏆 Leaderboard 🏆\n${format.join(' | ')}`;
    } catch (err) {
        console.log('[Error] Failed to create leaderboard', err);
    }
}

function goldRank(username) {
    let lb = sortLeaderboard();
    let rank = lb.findIndex(user => user.name.toLowerCase() === username.toLowerCase()) + 1;

    console.log("[REDEEM] Rank checked by ", username)
    if (!rank) {
        return `Redeem your daily gold to join the leaderboard, ${username}!`
    }

    if (rank <= 3) {
        let medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
        return ` ${medal} Here's your medal, ${username}! You're rank #${rank}!`
    }

    return `${username}, you are ranked #${rank} with ${lb[rank-1].redeems} redeems!`;
}

function wallet(username) {
    console.log(`[REDEEM] Wallet checked by ${username}`);
    let data = fs.readFileSync(FILE_PATH, 'utf-8');
    let jsonData = JSON.parse(data);
    let user = jsonData.find(chatter => chatter.name.toLowerCase() === username.toLowerCase());

    if (!user) { 
        return `You have not redeemed your daily gold yet, ${username}! Use the Daily Gold redeem to acquire your first gold!`;
    }
     
    // If the user has no wallet entry, we assume they have 0 gold
    return `You have ${user.wallet ? user.wallet : 0} gold, ${username}! ${user.wallet ? 'Use it to buy items in the shop!' : 'It smells like broke in here!'}`;
}

function distributeGold(users = []) {
    // This is a generic function to distribute gold to an array of users
    console.log("Distributing gold to users");
    try {
        let data = fs.readFileSync(FILE_PATH, 'utf-8');
        let jsonData = JSON.parse(data);

        users.forEach(username => {
            let user = jsonData.find(chatter => chatter.name.toLowerCase() === username.toLowerCase());
            // Define random amount of gold between 1 and 3 to give participants
            let goldGain = 1 + Math.floor(Math.random() * 3);
            if (user) {
                
                // Update user's gold and redeems
                user.redeems++;
                user.wallet += goldGain // Give 1 gold for participating in the rain
                console.log(`[SUCCESS] Distributed ${goldGain} gold to ${username}`);
            } else {
                jsonData.push({ name: username, redeems:  1, wallet: goldGain });
                console.log(`[NEW USER] Added ${username} with ${goldGain} gold`);
            }
        });

        fs.writeFileSync(FILE_PATH, JSON.stringify(jsonData, null, 4));
    } catch (err) {
        console.error(`[ERROR] Could not distribute gold. Manually distribute gold to ${users}`, err);
    }

}

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


const shopInventory = [
    vipItem,
    discordRoleItem,
    customChatTitleItem,
    customEntranceSoundItem,
    customFanfareItem
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

module.exports = { dailyGold, goldRank, goldTop, wallet, shopDescription, shopInventory, vipCheck, shopDescriptionObject, distributeGold };