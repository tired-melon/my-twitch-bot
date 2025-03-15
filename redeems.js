// Holding all the redeem functions here so I don't have to throw them all in a singular massive function
const fs = require('fs'); 
const FILE_PATH = 'daily_log.json'


function dailyGold(username) {
    console.log(`${username} redeemed their daily gold!`);
    try {
        
        let data = fs.readFileSync(FILE_PATH, 'utf-8');
        let jsonData = JSON.parse(data);

        let user = jsonData.find(chatter => chatter.name === username);

        if (user) {
            user.redeems++;
        } else {
            jsonData.push({ name: username, redeems: 1 });
        }

        fs.writeFileSync(FILE_PATH, JSON.stringify(jsonData, null, 4));

        console.log(`[SUCCESS] Daily Gold reedemed by ${username}`);

        return user.redeems
        
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

    let lb = sortLeaderboard().slice(0, top);
    let format = lb.map((user, index) => {
        let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
        return `${medal} ${user.name} - ${user.redeems} redeems`;
    });

    return `🏆 Leaderboard 🏆\n${format.join(' | ')}`;
}

function goldRank(username) {
    let lb = sortLeaderboard();
    let rank = lb.findIndex(user => user.name === username) + 1;

    if (!rank) {
        return `Redeem your daily gold to join the leaderboard, ${username}!`
    }

    if (rank <= 3) {
        let medal = rank === 1 ? '🥇' : index === 2 ? '🥈' : '🥉'
        return ` ${medal} Here's your medal, @${username}! You're rank #${rank}!`
    }

    return `${username}, you are ranked #${rank} with ${lb[rank-1].redeems} redeems!`;
}

module.exports = { dailyGold, goldRank, goldTop };