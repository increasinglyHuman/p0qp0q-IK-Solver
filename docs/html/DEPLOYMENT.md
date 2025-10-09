# Deploying p0qp0q-IK-Solver Documentation to poqpoq.com

This guide explains how to deploy the HTML documentation site to your production server at poqpoq.com.

---

## Prerequisites

- SSH access to poqpoq.com server
- SSH key: `~/.ssh/poqpoq2025.pem`
- Apache web server (already configured)
- Appropriate permissions on server

---

## Deployment Directory Structure

The documentation will be deployed to:

```
/var/www/ik-solver-docs/          # Main documentation root
├── index.html                     # Main entry point
├── getting-started.html           # Getting started guide
├── css/                           # Stylesheets
│   └── docs.css
├── js/                            # JavaScript (if needed)
├── images/                        # Documentation images
└── models/                        # Symlink to model images
```

---

## Step 1: Prepare Server Directory

SSH into the server and create the documentation directory:

```bash
# Connect to server
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@poqpoq.com

# Create directory structure
sudo mkdir -p /var/www/ik-solver-docs/{css,js,images}

# Set ownership
sudo chown -R ubuntu:www-data /var/www/ik-solver-docs

# Set permissions
sudo chmod -R 755 /var/www/ik-solver-docs
```

---

## Step 2: Configure Apache Virtual Host

Create or update the Apache configuration for the documentation site:

```bash
# Create Apache config file
sudo nano /etc/apache2/sites-available/ik-solver-docs.conf
```

Add the following configuration:

```apache
<VirtualHost *:80>
    ServerName poqpoq.com

    # Documentation alias
    Alias /ik-solver-docs "/var/www/ik-solver-docs"

    <Directory "/var/www/ik-solver-docs">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Or, if using HTTPS (recommended):

```apache
<VirtualHost *:443>
    ServerName poqpoq.com

    # SSL Configuration (if you have certificates)
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/poqpoq.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/poqpoq.com/privkey.pem

    # Documentation alias
    Alias /ik-solver-docs "/var/www/ik-solver-docs"

    <Directory "/var/www/ik-solver-docs">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Enable the site and reload Apache:

```bash
# Enable site (if new config file)
sudo a2ensite ik-solver-docs.conf

# Reload Apache
sudo systemctl reload apache2
```

---

## Step 3: Deploy Documentation Files

From your local machine, use `rsync` to deploy the documentation:

```bash
# Navigate to the HTML docs directory
cd /home/p0qp0q/blackbox/p0qp0q-IK-Solver/docs/html

# Deploy to server
rsync -avz --delete \
  -e "ssh -i ~/.ssh/poqpoq2025.pem" \
  ./ ubuntu@poqpoq.com:/var/www/ik-solver-docs/

# Create symlink to model images
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@poqpoq.com \
  "ln -s /home/ubuntu/ik-solver/models /var/www/ik-solver-docs/models"
```

---

## Step 4: Verify Deployment

1. Open your browser and navigate to:
   - `https://poqpoq.com/ik-solver-docs/`
   - or `http://poqpoq.com/ik-solver-docs/`

2. Check that:
   - [ ] Main page loads correctly
   - [ ] CSS styling is applied
   - [ ] Navigation works
   - [ ] Images display properly
   - [ ] Links to demos work

---

## One-Command Deployment Script

Create a deployment script for easy updates:

```bash
#!/bin/bash
# File: deploy-docs.sh

echo "🚀 Deploying p0qp0q-IK-Solver Documentation..."

# Set variables
LOCAL_DIR="/home/p0qp0q/blackbox/p0qp0q-IK-Solver/docs/html"
REMOTE_USER="ubuntu"
REMOTE_HOST="poqpoq.com"
REMOTE_DIR="/var/www/ik-solver-docs"
SSH_KEY="$HOME/.ssh/poqpoq2025.pem"

# Deploy files
echo "📤 Uploading files..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY" \
  "$LOCAL_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

# Set permissions
echo "🔒 Setting permissions..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "sudo chown -R ubuntu:www-data $REMOTE_DIR && sudo chmod -R 755 $REMOTE_DIR"

echo "✅ Deployment complete!"
echo "🌐 Visit: https://poqpoq.com/ik-solver-docs/"
```

Make it executable:

```bash
chmod +x deploy-docs.sh
```

Run it:

```bash
./deploy-docs.sh
```

---

## Alternative: Subdomain Deployment

If you prefer a subdomain (e.g., `docs.poqpoq.com`):

### Step 1: Configure DNS

Add an A record for `docs.poqpoq.com` pointing to your server IP.

### Step 2: Create Virtual Host

```apache
<VirtualHost *:443>
    ServerName docs.poqpoq.com
    DocumentRoot /var/www/ik-solver-docs

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/docs.poqpoq.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/docs.poqpoq.com/privkey.pem

    <Directory "/var/www/ik-solver-docs">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### Step 3: Get SSL Certificate

```bash
sudo certbot --apache -d docs.poqpoq.com
```

---

## Continuous Deployment (Optional)

For automatic deployment on git push, set up a webhook:

1. Create a webhook endpoint on your server
2. Configure GitHub webhook to call it on push
3. Have the webhook script pull and deploy

See `/var/www/alm-webhook-demo/` on the server for an example implementation.

---

## Troubleshooting

### Issue: 403 Forbidden

**Solution:** Check directory permissions

```bash
sudo chmod -R 755 /var/www/ik-solver-docs
sudo chown -R ubuntu:www-data /var/www/ik-solver-docs
```

### Issue: Images not loading

**Solution:** Check symlink to models directory

```bash
ls -la /var/www/ik-solver-docs/models
# Should show: models -> /home/ubuntu/ik-solver/models
```

If not, recreate:

```bash
ln -sf /home/ubuntu/ik-solver/models /var/www/ik-solver-docs/models
```

### Issue: CSS not applied

**Solution:** Check MIME types in Apache

```bash
sudo a2enmod mime
sudo systemctl restart apache2
```

### Issue: Apache not reloading

**Solution:** Check configuration syntax

```bash
sudo apache2ctl configtest
sudo systemctl status apache2
```

---

## Security Best Practices

1. **Use HTTPS:** Always serve documentation over HTTPS
2. **Restrict permissions:** Keep file permissions at 755 (directories) and 644 (files)
3. **Regular updates:** Keep Apache and SSL certificates up to date
4. **Firewall rules:** Ensure only ports 80/443 are open to public

---

## Updating Documentation

To update the documentation after changes:

1. Edit local files in `/home/p0qp0q/blackbox/p0qp0q-IK-Solver/docs/html/`
2. Run deployment script: `./deploy-docs.sh`
3. Verify changes at `https://poqpoq.com/ik-solver-docs/`

---

## Server Information

- **Host:** poqpoq.com (AWS EC2 Ubuntu)
- **SSH:** `ssh -i ~/.ssh/poqpoq2025.pem ubuntu@poqpoq.com`
- **Web Server:** Apache 2.4.58
- **OS:** Ubuntu 24.04 LTS
- **SSL:** Let's Encrypt (if configured)

---

## Contact

If you encounter issues:

- Check Apache logs: `/var/log/apache2/error.log`
- Check Apache access logs: `/var/log/apache2/access.log`
- Verify disk space: `df -h`
- Check Apache status: `sudo systemctl status apache2`

---

**Deployment Ready!** 🚀

Visit: `https://poqpoq.com/ik-solver-docs/`
