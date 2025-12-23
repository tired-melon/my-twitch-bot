function parseTwitchEmotes(message, emotes) {
  if (!emotes) return [{ type: 'text', content: message }];

  const tokens = [];
  const ranges = [];

  for (const emoteId in emotes) {
    emotes[emoteId].forEach(range => {
      const [start, end] = range.split('-').map(Number);
      ranges.push({ start, end, emoteId });
    });
  }

  ranges.sort((a, b) => a.start - b.start);

  let lastIndex = 0;

  for (const { start, end, emoteId } of ranges) {
    if (start > lastIndex) {
      tokens.push({
        type: 'text',
        content: message.slice(lastIndex, start)
      });
    }

    tokens.push({
      type: 'emote',
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/3.0`
    });

    lastIndex = end + 1;
  }

  if (lastIndex < message.length) {
    tokens.push({
      type: 'text',
      content: message.slice(lastIndex)
    });
  }

  return tokens;
}

module.exports = { parseTwitchEmotes };