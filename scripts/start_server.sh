#!/bin/bash  
cd /home/ubuntu/emoh-api-app
# npm install
sudo npx prisma generate
sudo pm2 startup
sudo pm2 start ecosystem.config.js
sudo pm2 save

sudo systemctl restart nginx

