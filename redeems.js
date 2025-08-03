// Holding all the redeem functions (and the shop) here so I don't have to throw them all in a singular massive function
const fs = require('fs'); 
const { betterRandom } = require('./testing');
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
            let goldGain = 1 + Math.floor(betterRandom(3, 1));
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


module.exports = { dailyGold, goldRank, goldTop, wallet, distributeGold };