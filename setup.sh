sudo apt-get upgrade -y sudo apt-get update -y

curl -sL https://deb.nodesource.com/setup_15.x | sudo -E bash -
sudo apt-get install -y nodejs


sudo apt install mysql-server -y
# TODO: Get this script to run without user input

sudo apt-get install nginx -y
sudo ufw allow 'Nginx HTTP'
sudo ufw allow ssh
sudo ufw enable
# TODO: Configure etc/nginx/sites-enabled to point to correct directory
sudo mysql_secure_installation

cd etc/nginx/sites-enabled && sudo sed -i "s/root \/var\/www\/html;/root \/home\/ubuntu\/DarkYears\/frontend;/g" default

sudo systemctl restart nginx
