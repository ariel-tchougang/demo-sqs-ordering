const config = require('./config.json');
const express = require('express');
const cors = require('cors');

const AWS = require('aws-sdk');
const app = express();
const port = 5000;

AWS.config.update({ region: process.env.AWS_REGION });
const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

// Enable CORS for all routes
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/properties/config', async (_, res) => {
    let properties = {
        "STANDARD_QUEUE_URL": process.env.STANDARD_QUEUE_URL,
        "FIFO_QUEUE_URL": process.env.FIFO_QUEUE_URL, 
        "POLLING_INTERVAL": process.env.POLLING_INTERVAL ? process.env.POLLING_INTERVAL : config.POLLING_INTERVAL, 
        "DELAY_BEFORE_CALLING_RECEIVE": process.env.DELAY_BEFORE_CALLING_RECEIVE ? process.env.DELAY_BEFORE_CALLING_RECEIVE : config.DELAY_BEFORE_CALLING_RECEIVE,  
        "SEGMENT_SIZE": process.env.SEGMENT_SIZE ? process.env.SEGMENT_SIZE : config.SEGMENT_SIZE,
        "AWS_REGION": process.env.AWS_REGION
    };

    try {
        res.json(properties);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/api/send-segments-to-sqs', (req, res) => {

    let segments = req.body.segments;
    let queueUrl = req.body.queueUrl;

    let params = {
        MessageBody: JSON.stringify(segments),
        QueueUrl: queueUrl
    };

    if (req.body.uuid) {
        params.MessageGroupId = req.body.uuid;
    }

    sqs.sendMessage(params, function(err, _) {
        if (err) {
            console.log("Error", err);
            res.status(500).json({ error: err });
        } else {
            res.status(200).json({ success: true });
        }
    });
});

app.post('/api/receive-segments-from-sqs', async (req, res) => {
    let queueUrl = req.body.queueUrl;
    let maxNumberOfMessages = process.env.MAX_NUMBER_OF_MESSAGES ? process.env.MAX_NUMBER_OF_MESSAGES : config.MAX_NUMBER_OF_MESSAGES;

    let params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(maxNumberOfMessages, 10)
    };

    try {
        let data = await sqs.receiveMessage(params).promise();
        res.json(data);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/api/delete-segments-from-sqs', (req, res) => {
    const { queueUrl, receiptHandle } = req.body;

    const deleteParams = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
    };

    sqs.deleteMessage(deleteParams, function(err, data) {
        if (err) {
            console.log("Delete Error", err);
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.post('/api/purge-segments-from-sqs', (req, res) => {
    const { queueUrl } = req.body;

    const purgeParams = {
        QueueUrl: queueUrl
    };

    sqs.purgeQueue(purgeParams, function(err, data) {
        if (err) {
            console.log("Purge Error", err);
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname});
});

app.listen(port, () => {
    console.log(`Now listening on port ${port}`); 
});


