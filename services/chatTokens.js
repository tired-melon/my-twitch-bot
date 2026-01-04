function buildChatTokens(message, tags) {
    const emotes = tags.emotes || {};

    // Collect emote ranges
    const emoteRanges = [];

    for (const [id, positions] of Object.entries(emotes)) {
        for (const pos of positions) {
            const [start, end] = pos.split('-').map(Number);
            emoteRanges.push({
                type: 'emote',
                id,
                start,
                end,
                url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`
            });
        }
    }

    // Sort emotes by position
    emoteRanges.sort((a, b) => a.start - b.start);

    const tokens = [];
    let cursor = 0;

    for (const emote of emoteRanges) {
        // Text before emote
        if (cursor < emote.start) {
            tokens.push({
                type: 'text',
                content: message.slice(cursor, emote.start)
            });
        }

        tokens.push({
            type: 'emote',
            url: emote.url
        });

        cursor = emote.end + 1;
    }

    // Remaining text
    if (cursor < message.length) {
        tokens.push({
            type: 'text',
            content: message.slice(cursor)
        });
    }

    return tokens;
}

module.exports = { buildChatTokens };