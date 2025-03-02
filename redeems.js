// Holding all the redeem functions here so I don't have to throw them all in a singular massive function
import fs from 'fs'

const FILE_PATH = 'daily_log.json'

export function dailyGold(username) {
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