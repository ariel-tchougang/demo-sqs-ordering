# Demo AWS SQS ordering scheme

This demo project shows a screen where one can:
* Select an SQS queue type (STANDARD or FIFO)
* Draw something on the left side canvas of the screen
* Click "Start" button to send all datapoints to SQS and later have your drawing displayed on the right side canvas
* Click "Clear" button to 
  * Stop all processes, 
  * Purge all queues, 
  * Clear both canvas

The idea is to observe how your drawing is reconstituted:
* With FIFO queue: it should be done in the same order you drew
* With STANDARD: the ordering might somehow messier

## Technologies used:
* Node 18.16.0
* Javascript
* Express
* Docker
* Docker compose
* AWS SDK for Javascript

## Environment variables

* STANDARD_QUEUE_URL: Standard SQS queue URL (https://sqs.REPLACE_WITH_REGION.amazonaws.com/REPLACE_WITH_ACCOUNTID/REPLACE_WITH_QUEUENAME)
* FIFO_QUEUE_URL: FIFO SQS queue URL (https://sqs.REPLACE_WITH_REGION.amazonaws.com/REPLACE_WITH_ACCOUNTID/REPLACE_WITH_QUEUENAME.fifo)
* MAX_NUMBER_OF_MESSAGES: Max number of messages to be retrieved per sqs.receiveMessage call. Default value 5, max value 10.
* POLLING_INTERVAL: Frequency at which the application will poll the selected queue. Default 2000 (ms)
* DELAY_BEFORE_CALLING_RECEIVE: Delay before polling the selected queue, once datapoints have started being sent to SQS. Default 3000 (ms)
* SEGMENT_SIZE: Datapoints grouping size. Default 10.
* AWS_REGION: AWS Region where your queues are located
* AWS_ACCESS_KEY_ID: AWS Access ID with permission to use your queues (send, receive, delete messages, purge)
* AWS_SECRET_ACCESS_KEY: AWS Secret Access Key corresponding to AWS_ACCESS_KEY_ID
* AWS_SESSION_TOKEN: In case you're using a temporary session with an IAM role.

## Getting started

### Build docker image

```bash
docker build -t sqs-ordering-demo .

```

### Launch service

* Setup the docker-compose.yml file with your own configuration parameters.

```yaml
version: '3'

services:
  app:
    image: sqs-ordering-demo
    ports:
      - 8080:5000
    environment:
      - STANDARD_QUEUE_URL=https://sqs.REPLACE_WITH_REGION.amazonaws.com/REPLACE_WITH_ACCOUNTID/REPLACE_WITH_QUEUENAME
      - FIFO_QUEUE_URL=https://sqs.REPLACE_WITH_REGION.amazonaws.com/REPLACE_WITH_ACCOUNTID/REPLACE_WITH_QUEUENAME.fifo
      - MAX_NUMBER_OF_MESSAGES=5
      - POLLING_INTERVAL=2000
      - DELAY_BEFORE_CALLING_RECEIVE=3000
      - SEGMENT_SIZE=10
      - AWS_REGION=REPLACE_WITH_REGION
      - AWS_ACCESS_KEY_ID=REPLACE_WITH_AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY=REPLACE_WITH_AWS_SECRET_ACCESS_KEY
      - AWS_SESSION_TOKEN=REPLACE_WITH_AWS_SESSION_TOKEN
```

* Run the service

```bash
docker-compose up

```

* Open the server page on a browser: http://localhost:8080

* Enjoy

## Clean up

* Stop the service

```bash
docker-compose down

```

* Remove the docker image

```bash
docker rmi -f sqs-ordering-demo

```

## Disclaimer
The current interface is quite ugly as I'm no UI designer. So by all means, feel free to propose a more appealing one anytime.

![Alt text](/images/screenshot.png?raw=true "screenshot")
