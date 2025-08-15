const ws = new WebSocket(`ws://${window.location.host}`);

ws.addEventListener('message', event => {
    const data = JSON.parse(event.data);

    if (data.type === 'chat') {
        addChatMessage(data);
    }
});

let messageQueue = [];
let animating = false;
let lastMessageTime = 0;
let MAX_MESSAGES = 8

function addChatMessage({ username, title, profilePic, message }) {

    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble');

    const img = document.createElement('img');
    img.src = profilePic;
    img.width = img.height = 48;

    const textContainer = document.createElement('div');
    textContainer.classList.add('chat-text');

    const nameElem = document.createElement('div');
    nameElem.classList.add('chat-username');
    nameElem.textContent = username;

    titleElem = document.createElement('div');
    titleElem.classList.add('chat-title');
    titleElem.textContent = title;

    const messageElem = document.createElement('div');
    messageElem.textContent = message;


    textContainer.appendChild(nameElem);
    textContainer.appendChild(titleElem);
    textContainer.appendChild(messageElem);
    bubble.appendChild(img);
    bubble.appendChild(textContainer);

    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(20px)';

    messageQueue.push(bubble)
    if (!animating) processMessageQueue();

    // Auto-remove after 20 seconds
    setTimeout(() => fadeOutAndRemove(bubble), 30000);

    enforceMaxMessages();
}

function processMessageQueue() {
    if (messageQueue.length === 0) {
        animating = false;
        return;
    }

    animating = true;
    const bubble = messageQueue.shift();
    const container = document.getElementById('chat-container');

    bubble.style.opacity = 0;
    bubble.style.transform = 'translateY(20px)';

    container.appendChild(bubble);

    // Threaten the DOM's family to trigger fade in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            bubble.style.opacity = '1';
            bubble.style.transform = 'translateY(0)';
        });
    });

    // Dynamic Message Stagger
    const now = Date.now();
    let delay = 100;
    if (lastMessageTime) {
        const delta = now - lastMessageTime;
        // More messages = less delay, less messages = more delay
        delay = Math.max(50, Math.min(200, delta / 2));
    }
    lastMessageTime = now;

    setTimeout(processMessageQueue, delay);
}

function fadeOutAndRemove(bubble) {
    if (!bubble) return;
    bubble.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(-20px)'; // move upwards
    setTimeout(() => {
        bubble.remove();
        shiftMessagesUp();
    }, 500); // remove after animation
}

function shiftMessagesUp() {
    const container = document.getElementById('chat-container');
    const bubbles = Array.from(container.children);

    bubbles.forEach(b, i => {
        b.style.transform = 'translateY(-20px)';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setTimeout(() => b.style.transform = 'translateY(0)', i * 30));
        });
    });
}

function enforceMaxMessages() {
    const container = document.getElementById('chat-container');
    while (container.children.length > MAX_MESSAGES) {
        fadeOutAndRemove(container.firstChild);
        shiftMessagesUp();
    }
}
