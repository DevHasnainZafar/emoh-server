#!/bin/bash
ENV_FILE="/home/ubuntu/cd-app/.env"

echo "Waiting for PM2 to stabilize..."
sleep 10  # Adjust the delay as necessary

if [ -f "$ENV_FILE" ]; then
    echo "Removing .env file..."
    sudo rm -rf "$ENV_FILE"
    echo ".env file removed successfully."
else
    echo ".env file does not exist."
fi
