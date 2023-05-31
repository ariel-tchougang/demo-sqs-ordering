let config;

fetch('/properties/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
})
.then(response => response.json())
.then(data => {
    config = data;
})
.catch(error => console.error(error));

let queueType = document.getElementById('queueType');
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const clone = document.getElementById("clone");
const cloneCtx = clone.getContext("2d");

let coord = { x: 0, y: 0 };
let segments = [];
let intervalId = null;

document.addEventListener("mousedown", start);
document.addEventListener("mouseup", stop);
window.addEventListener("resize", resize);

let startButton = document.getElementById('startBtn');
startBtn.addEventListener('click', startSendingDatapoints);
let clearButton = document.getElementById('clearBtn');
clearBtn.addEventListener('click', clear);

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

resize();

function resize() {
    ctx.canvas.width = window.innerWidth / 2;
    ctx.canvas.height = ctx.canvas.width;
    clone.width = ctx.canvas.width;
    clone.height = ctx.canvas.height;
}

function reposition(event) {
    coord.x = event.clientX - canvas.getBoundingClientRect().left;
    coord.y = event.clientY - canvas.getBoundingClientRect().top;
}

function start(event) {
    document.addEventListener("mousemove", draw);
    reposition(event);
}

function stop() {
    document.removeEventListener("mousemove", draw);
}

function getQueueType() {
    if (!config) {
        throw new Error('Config not loaded yet');
    }
    return isFifoQueue() ? config.FIFO_QUEUE_URL : config.STANDARD_QUEUE_URL;
}

function isFifoQueue() {
    return queueType.value === 'FIFO';
}

async function startSendingDatapoints() {

    if (!config) {
        throw new Error('Config not loaded yet');
    }

    if (segments.length === 0) {
        return;
    }

    startButton.disabled = true;
    queueType.disabled = true;
    cloneCtx.clearRect(0, 0, clone.width, clone.height);

    let uuid = isFifoQueue() ? generateUUID() : null;

    const size = parseInt(config.SEGMENT_SIZE);
    let subArray = [];
    for (let i = 0; i < segments.length; i += size) {
        subArray = segments.slice(i, i + size);
        sendSegmentToSQS(subArray, getQueueType(), uuid);
    }

    await delay(config.DELAY_BEFORE_CALLING_RECEIVE);
    startReceivingingDatapoints();
}

function startReceivingingDatapoints() {
    if (!config) {
        throw new Error('Config not loaded yet');
    }
    intervalId = setInterval(() => readFromSegmentQueue(getQueueType()), config.POLLING_INTERVAL);
}

function clear() {
    stopReceivingDatapoints();
    segments = [];
    cloneCtx.clearRect(0, 0, clone.width, clone.height);
    ctx.clearRect(0, 0, clone.width, clone.height);
    purgeAllQueues();
}

function purgeAllQueues() {
    purgeQueue(config.STANDARD_QUEUE_URL);
    purgeQueue(config.FIFO_QUEUE_URL);
}

async function purgeQueue(queueUrl) {
    await fetch('/api/purge-segments-from-sqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueUrl })
    });
}

function stopReceivingDatapoints() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    startButton.disabled = false;
    queueType.disabled = false;
}

function sendSegmentToSQS(segments, queueUrl, uuid) {
    if (!config) {
        throw new Error('Config not loaded yet');
    }

    let payload = uuid ? JSON.stringify({segments, queueUrl, uuid}) : JSON.stringify({segments, queueUrl});

    fetch('/api/send-segments-to-sqs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: payload,
    })
    .then(response => response.json())
    .catch((error) => {
        console.error('Error:', error);
    });
}

function readFromSegmentQueue(queueUrl) {
    fetch('/api/receive-segments-from-sqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueUrl })
    })
    .then(response => response.json())
    .then(data => {
        if (data.Messages && data.Messages.length > 0) {
            data.Messages.forEach(async message => {
                let segments = JSON.parse(message.Body);
                for(let i = 0; i < segments.length; i++) {
                    let segment = segments[i];
                    drawLine(cloneCtx, segment.fromX1, segment.fromY1, segment.toX2, segment.toY2);
                }
                
                await fetch('/api/delete-segments-from-sqs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ queueUrl, receiptHandle: message.ReceiptHandle })
                });
            });
        } else if (!data.Messages || data.Messages.length === 0) {
            stopReceivingDatapoints();
        }
    })
    .catch(err => console.log("Error", err));
}

function draw(event) {
    let fromX1 = coord.x;
    let fromY1 = coord.y;
    reposition(event);
    let toX2 = coord.x;
    let toY2 = coord.y;
    segments.push({ fromX1, fromY1, toX2, toY2 });
    drawLine(ctx, fromX1, fromY1, toX2, toY2);
}

function drawLine(ctx, fromX1, fromY1, toX2, toY2) {
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#C0392B";

    ctx.moveTo(fromX1, fromY1);
    ctx.lineTo(toX2, toY2);
    ctx.stroke();
}

function generateUUID() {
    const cryptoObj = window.crypto || window.msCrypto; // For browser compatibility
    const buffer = new Uint8Array(16);
    cryptoObj.getRandomValues(buffer);
  
    buffer[6] = (buffer[6] & 0x0f) | 0x40; // Version 4
    buffer[8] = (buffer[8] & 0x3f) | 0x80; // Variant RFC4122
  
    const hexValues = Array.from(buffer, byte => byte.toString(16).padStart(2, '0'));
    const uuid = [
      hexValues.slice(0, 4).join(''),
      hexValues.slice(4, 6).join(''),
      hexValues.slice(6, 8).join(''),
      hexValues.slice(8, 10).join(''),
      hexValues.slice(10).join('')
    ].join('-');
  
    return uuid;
  }

  function splitArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }