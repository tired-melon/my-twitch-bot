// Holding all the redeem functions here so I don't have to throw them all in a singular massive function
const fs = require('fs');


fetch('daily_log.json')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error fetching JSON:', error));

const dailyGold = (username) => {
    console.log(`${user} redeemed their daily gold!`);
    let data = fs.readFileSync('daily_log.json', 'utf-8');
    try {
        let jsonData = JSON.parse(data);

        let user = jsonData.find(chatter => chatter.name === user);

        if (user) {
            user.redeems++;
        } else {
            jsonData.push({ name: username, redeems: 1 });
        }

        fs.writeFileSync('daily_log.json', JSON.stringify(jsonData, null, 4));

        console.log(`[SUCCESS] Daily Gold reedemed by ${username}`);
    } catch(err) {
        console.error('[ERROR] Could not update redeems', err);
    }
}

dailyGold('tiredmelon_');