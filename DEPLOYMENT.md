# 🚀 Deployment Guide - VoteCast

This guide covers multiple deployment options for your voting platform.

## 📋 Pre-Deployment Checklist

1. ✅ Test the application locally
2. ✅ Update admin credentials (change default password)
3. ✅ Review security settings
4. ✅ Backup database if needed

---

## 🌐 Option 1: Railway (Recommended - Easiest)

Railway is the simplest option with automatic deployments.

### Steps:

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   ```bash
   # Push your code to GitHub first
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

3. **Deploy on Railway**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect Node.js

4. **Set Environment Variables** (Optional)
   - Go to Variables tab
   - Add `PORT` (usually auto-set)
   - Add `ADMIN_PASSWORD` (change from default)

5. **Get Your URL**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Update your domain if needed

**Cost:** Free tier available, then $5/month

---

## 🌐 Option 2: Render

Render offers free tier with automatic SSL.

### Steps:

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - **Name:** votecast (or your choice)
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free (or paid for better performance)

4. **Set Environment Variables**
   - Add `PORT` (Render sets this automatically)
   - Add `ADMIN_PASSWORD` (change from default)

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)

**Cost:** Free tier available

---

## 🌐 Option 3: Heroku

Classic platform-as-a-service option.

### Steps:

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Or download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set ADMIN_PASSWORD=your-secure-password
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Open App**
   ```bash
   heroku open
   ```

**Cost:** Free tier discontinued, starts at $5/month

---

## 🌐 Option 4: DigitalOcean App Platform

Simple deployment with good performance.

### Steps:

1. **Create DigitalOcean Account**
   - Go to [digitalocean.com](https://www.digitalocean.com)
   - Sign up

2. **Create App**
   - Go to "Apps" → "Create App"
   - Connect GitHub repository

3. **Configure**
   - **Type:** Web Service
   - **Build Command:** `npm install`
   - **Run Command:** `node server.js`
   - **Environment Variables:**
     - `PORT` (auto-set)
     - `ADMIN_PASSWORD` (your secure password)

4. **Deploy**
   - Click "Create Resources"
   - Wait for deployment

**Cost:** Starts at $5/month

---

## 🌐 Option 5: VPS (DigitalOcean Droplet, Linode, etc.)

Full control with a virtual private server.

### Steps:

1. **Create VPS Instance**
   - Choose Ubuntu 22.04 LTS
   - Minimum: 1GB RAM, 1 vCPU
   - Recommended: 2GB RAM, 1 vCPU

2. **SSH into Server**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Node.js**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Node.js 18.x
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

4. **Install PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   ```

5. **Clone Your Repository**
   ```bash
   # Install Git
   apt install -y git
   
   # Clone repo (or upload files)
   git clone YOUR_REPO_URL
   cd voting
   
   # Install dependencies
   npm install --production
   ```

6. **Set Environment Variables**
   ```bash
   export PORT=3000
   export ADMIN_PASSWORD=your-secure-password
   ```

7. **Start Application with PM2**
   ```bash
   pm2 start server.js --name votecast
   pm2 save
   pm2 startup
   ```

8. **Setup Nginx (Reverse Proxy)**
   ```bash
   apt install -y nginx
   
   # Create Nginx config
   nano /etc/nginx/sites-available/votecast
   ```

   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
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

   ```bash
   # Enable site
   ln -s /etc/nginx/sites-available/votecast /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

9. **Setup SSL with Let's Encrypt**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

10. **Configure Firewall**
    ```bash
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw enable
    ```

**Cost:** $4-6/month for basic VPS

---

## 🔒 Security Checklist

Before going live, ensure:

- [ ] Change default admin password
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Regular backups of database
- [ ] Monitor logs for suspicious activity

---

## 📝 Environment Variables

Create a `.env` file (or set in your platform):

```env
PORT=3000
ADMIN_PASSWORD=your-secure-password-here
DATABASE_PATH=voting.db
```

**Important:** Never commit `.env` file to Git!

---

## 🔄 Updating Your Deployment

### Railway/Render/Heroku:
```bash
git add .
git commit -m "Update"
git push
# Auto-deploys
```

### VPS:
```bash
ssh user@your-server
cd voting
git pull
pm2 restart votecast
```

---

## 📊 Monitoring

### PM2 Commands (VPS):
```bash
pm2 status          # Check status
pm2 logs votecast   # View logs
pm2 restart votecast # Restart app
pm2 monit           # Monitor resources
```

---

## 🗄️ Database Backup

The SQLite database is stored in `voting.db`. To backup:

```bash
# Copy database file
cp voting.db voting-backup-$(date +%Y%m%d).db

# Or use SQLite backup command
sqlite3 voting.db ".backup backup.db"
```

---

## 🆘 Troubleshooting

### App won't start:
- Check logs: `pm2 logs` or platform logs
- Verify Node.js version: `node --version` (should be 18+)
- Check port availability
- Verify environment variables

### Database issues:
- Ensure write permissions on database file
- Check disk space
- Verify database path

### 502 Bad Gateway (Nginx):
- Check if app is running: `pm2 status`
- Verify proxy_pass URL matches app port
- Check Nginx error logs: `tail -f /var/log/nginx/error.log`

---

## 📞 Support

For platform-specific issues, check:
- Railway: [docs.railway.app](https://docs.railway.app)
- Render: [render.com/docs](https://render.com/docs)
- Heroku: [devcenter.heroku.com](https://devcenter.heroku.com)
- DigitalOcean: [docs.digitalocean.com](https://docs.digitalocean.com)

---

## 🎉 Post-Deployment

1. Test all features:
   - Admin login
   - Create poll
   - Vote anonymously
   - View results
   - Leaderboard

2. Share your URL with users!

3. Monitor usage and performance

Good luck with your deployment! 🚀

