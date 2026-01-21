// betterRandom() takes a minimum and maximum integer to randomly pick between
// It exists because using Math.Random() got me nagged at 

function betterRandom(max, min = 0) {
   
    if (max % 1 || min % 1) { // verifying that these are integers
        console.log("[ERROR] Either you misused the function or we have a big problem.");
        console.log(`[DEBUG] Min: ${min}. Max: ${max}`);
        return;
    }

    if (min > max) {
        console.log('[ERROR] number(s) out of range!');
        console.log(`[DEBUG] Min: ${min}. Max: ${max}`);
        return;
    };

    const buffer = new Uint32Array(1); // 32-bit number should be sufficient randomness
    crypto.getRandomValues(buffer);
    const randomFraction = buffer[0] / 0xFFFFFFFF;
    range = max - min + 1;
    randomOutput = Math.floor(randomFraction * range ) + min;

    return randomOutput;
}

module.exports = { betterRandom };