# Detailed Deployment Instructions

This document provides step-by-step instructions for deploying The Academy Basketball Website with the integrated communication portal.

## Server Requirements

- **Operating System**: Linux (Ubuntu 20.04 LTS or newer recommended)
- **RAM**: Minimum 2GB, 4GB recommended
- **Storage**: Minimum 10GB available space
- **Node.js**: Version 14.x or higher
- **MongoDB**: Version 4.4 or higher
- **HTTPS**: SSL certificate for secure connections

## Step 1: Server Preparation

1. Update your server:
   ```
   sudo apt update
   sudo apt upgrade -y
   ```

2. Install Node.js:
   ```
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. Install MongoDB:
   ```
   wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
   sudo apt update
   sudo apt install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

4. Install PM2 (process manager):
   ```
   sudo npm install -g pm2
   ```

## Step 2: Application Deployment

1. Create application directory:
   ```
   sudo mkdir -p /var/www/academy
   ```

2. Copy deployment package to server:
   ```
   # If using SCP:
   scp -r deployment_package/* user@your-server:/var/www/academy
   
   # If uploading via FTP/SFTP:
   # Use your preferred FTP client to upload files
   ```

3. Set proper permissions:
   ```
   sudo chown -R www-data:www-data /var/www/academy
   sudo chmod -R 755 /var/www/academy
   ```

4. Install dependencies:
   ```
   cd /var/www/academy/backend
   npm install
   ```

## Step 3: Configuration

1. Create environment file:
   ```
   cd /var/www/academy
   cp config/env.example .env
   ```

2. Edit the .env file with your specific settings:
   ```
   nano .env
   ```

   Update the following values:
   - `PORT`: The port your application will run on (default: 3000)
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string for JWT token encryption
   - `EMAIL_*`: Your email service settings for notifications
   - `VAPID_*`: Your VAPID keys for push notifications

3. Generate VAPID keys for push notifications (if needed):
   ```
   npx web-push generate-vapid-keys
   ```

## Step 4: Database Setup

1. Run the database setup script:
   ```
   cd /var/www/academy
   node database/setup.js
   ```

2. Verify database setup:
   ```
   mongo
   use academy_portal
   db.users.find()
   ```
   
   You should see the admin user created by the setup script.

## Step 5: Starting the Application

1. Start the application with PM2:
   ```
   cd /var/www/academy/backend
   pm2 start server.js --name academy-portal
   ```

2. Configure PM2 to start on boot:
   ```
   pm2 startup
   pm2 save
   ```

3. Verify the application is running:
   ```
   pm2 status
   ```

## Step 6: Web Server Configuration (Nginx)

1. Install Nginx:
   ```
   sudo apt install -y nginx
   ```

2. Create Nginx configuration:
   ```
   sudo nano /etc/nginx/sites-available/academy
   ```

3. Add the following configuration:
   ```
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Enable the site:
   ```
   sudo ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Step 7: SSL Configuration

1. Install Certbot:
   ```
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. Obtain SSL certificate:
   ```
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

3. Follow the prompts to complete SSL setup.

## Step 8: Testing

1. Visit your website at https://your-domain.com
2. Test user registration and login
3. Test messaging features
4. Test file sharing
5. Test notifications

## Troubleshooting

### Application Not Starting
- Check logs: `pm2 logs academy-portal`
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check .env configuration

### Database Connection Issues
- Verify MongoDB connection string in .env
- Check MongoDB is running: `sudo systemctl status mongod`
- Check MongoDB logs: `sudo journalctl -u mongod`

### Nginx Configuration Issues
- Check Nginx syntax: `sudo nginx -t`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

## Maintenance

### Backing Up the Database
```
mongodump --db academy_portal --out /backup/$(date +%Y-%m-%d)
```

### Updating the Application
1. Stop the application: `pm2 stop academy-portal`
2. Pull new code or upload new files
3. Install any new dependencies: `npm install`
4. Start the application: `pm2 start academy-portal`

### Monitoring
- Check application status: `pm2 status`
- Monitor logs: `pm2 logs academy-portal`
- Monitor server resources: `htop`
