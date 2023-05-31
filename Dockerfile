# Use the official Node.js 18.x image as the base image
FROM node:18.16.0

# Set the working directory in the container
WORKDIR /app

# Copy the project files and folders from the host to the container
COPY . /app

# Install dependencies
RUN npm ci --only=production

# Set the environment variables
ENV STANDARD_QUEUE_URL="your_standard_queue_url"
ENV FIFO_QUEUE_URL="your_fifo_queue_url"
ENV MAX_NUMBER_OF_MESSAGES=5
ENV POLLING_INTERVAL=2000
ENV DELAY_BEFORE_CALLING_RECEIVE=3000
ENV SEGMENT_SIZE=10
ENV AWS_REGION="your_aws_region"
ENV AWS_ACCESS_KEY_ID="your_aws_access_key_id"
ENV AWS_SECRET_ACCESS_KEY="your_aws_secret_access_key"
ENV AWS_SESSION_TOKEN=""

# Expose port 5000
EXPOSE 5000

# Run the application
CMD ["node", "index.js"]
