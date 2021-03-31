#!/bin/bash
sudo apt-get upgrade -y sudo apt-get update -y


#==NODEJS==
curl -sL https://deb.nodesource.com/setup_15.x | sudo -E bash -
sudo apt-get install -y nodejs


#==MYSQL==
sudo apt install mysql-server -y
# TODO: Get this script to run without user input
sudo mysql_secure_installation
./create_schema.sh
sudo mysql < create_schema.sh


#==NGINX==
sudo apt-get install nginx -y
sudo ufw allow 'Nginx HTTP'
sudo ufw allow ssh
sudo ufw enable
cd /etc/nginx/sites-enabled && sudo sed -i "s/root \/var\/www\/html;/root \/home\/ubuntu\/DarkYears\/frontend;/g" default
sudo systemctl restart nginx


#==CERTBOT==
sudo apt-get install certbot
sudo apt-get install python-certbot-nginx
sudo certbox --nginx
