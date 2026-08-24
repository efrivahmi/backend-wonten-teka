#!/bin/bash
###############################################################################
# Wonten Teka — Deployment Script for AWS EC2 (Nginx + PHP-FPM)
#
# CARA PAKAI:
# 1. Buka EC2 Instance Connect dari AWS Console
# 2. Copy-paste seluruh isi script ini ke terminal
# 3. Tunggu hingga selesai
#
# Server: 18.143.176.112
# Domain: https://www.great-symbols-begin-freely.st.a.dcdg.xyz
###############################################################################

set -e  # Stop on error

echo "=============================================="
echo "  Wonten Teka - Backend Deployment Script"
echo "=============================================="

# ── STEP 1: Detect OS & PHP Version ─────────────────────────────────────────
echo ""
echo "[1/8] Detecting system..."

if command -v apt &> /dev/null; then
    PKG_MANAGER="apt"
    echo "  → Package manager: apt (Ubuntu/Debian)"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    echo "  → Package manager: dnf (Amazon Linux)"
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    echo "  → Package manager: yum (Amazon Linux)"
else
    echo "  ✗ Unknown package manager!"
    exit 1
fi

PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;" 2>/dev/null || echo "none")
echo "  → PHP Version: $PHP_VERSION"

# ── STEP 2: Install PHP Extensions ──────────────────────────────────────────
echo ""
echo "[2/8] Installing PHP extensions..."

if [ "$PKG_MANAGER" = "apt" ]; then
    sudo apt update -y
    sudo apt install -y \
        php${PHP_VERSION}-mbstring \
        php${PHP_VERSION}-xml \
        php${PHP_VERSION}-bcmath \
        php${PHP_VERSION}-curl \
        php${PHP_VERSION}-zip \
        php${PHP_VERSION}-sqlite3 \
        php${PHP_VERSION}-tokenizer \
        php${PHP_VERSION}-fpm \
        unzip git curl
else
    sudo $PKG_MANAGER install -y \
        php-mbstring php-xml php-bcmath php-curl \
        php-zip php-sqlite3 php-tokenizer php-fpm \
        unzip git curl
fi

echo "  ✓ PHP extensions installed"

# ── STEP 3: Install Composer ────────────────────────────────────────────────
echo ""
echo "[3/8] Installing Composer..."

if ! command -v composer &> /dev/null; then
    cd /tmp
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    echo "  ✓ Composer installed"
else
    echo "  ✓ Composer already installed ($(composer --version 2>/dev/null | head -1))"
fi

# ── STEP 4: Create Project Directory ────────────────────────────────────────
echo ""
echo "[4/8] Setting up project directory..."

sudo mkdir -p /var/www/wonten-teka
sudo chown -R $USER:$USER /var/www/wonten-teka

echo "  ✓ Directory created: /var/www/wonten-teka"

# ── STEP 5: Upload Code ─────────────────────────────────────────────────────
echo ""
echo "[5/8] Preparing for code upload..."
echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │ KODE BACKEND PERLU DI-UPLOAD KE SERVER!             │"
echo "  │                                                     │"
echo "  │ Opsi 1 - Git:                                       │"
echo "  │   cd /var/www/wonten-teka                            │"
echo "  │   git clone <URL_REPO> .                             │"
echo "  │                                                     │"
echo "  │ Opsi 2 - Upload ZIP via browser:                    │"
echo "  │   Gunakan File Manager di EC2 Instance Connect      │"
echo "  │                                                     │"
echo "  │ Setelah upload, pastikan folder backend ada di:      │"
echo "  │   /var/www/wonten-teka/backend/                      │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""

# Check if code exists
if [ ! -f "/var/www/wonten-teka/backend/artisan" ]; then
    echo "  ⚠ Backend code not found yet!"
    echo "  Upload kode terlebih dahulu, lalu jalankan script bagian 2 di bawah."
    echo ""
    echo "  Setelah upload, jalankan:"
    echo "  bash /var/www/wonten-teka/deploy-part2.sh"
    
    # Create part 2 script
    cat > /var/www/wonten-teka/deploy-part2.sh << 'PART2_EOF'
#!/bin/bash
set -e

cd /var/www/wonten-teka/backend

echo "[6/8] Installing Laravel dependencies..."
composer install --optimize-autoloader --no-dev
echo "  ✓ Dependencies installed"

echo ""
echo "[6b/8] Setting up environment..."
cp .env.example .env
php artisan key:generate --force

# Update .env for production
sed -i 's/APP_ENV=local/APP_ENV=production/' .env
sed -i 's/APP_DEBUG=true/APP_DEBUG=false/' .env
sed -i 's|APP_URL=http://localhost|APP_URL=https://www.great-symbols-begin-freely.st.a.dcdg.xyz|' .env
sed -i 's/SESSION_DRIVER=database/SESSION_DRIVER=file/' .env
sed -i 's/CACHE_STORE=database/CACHE_STORE=file/' .env
sed -i 's/QUEUE_CONNECTION=database/QUEUE_CONNECTION=sync/' .env

echo "  ✓ Environment configured"

echo ""
echo "[6c/8] Running migrations & seeder..."
touch database/database.sqlite
php artisan migrate --seed --force
echo "  ✓ Database ready with dummy data"

echo ""
echo "[6d/8] Creating storage link & optimizing..."
php artisan storage:link 2>/dev/null || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
echo "  ✓ Optimized for production"

echo ""
echo "[7/8] Setting file permissions..."

# Detect PHP-FPM user
if id "www-data" &>/dev/null; then
    WEB_USER="www-data"
elif id "nginx" &>/dev/null; then
    WEB_USER="nginx"
elif id "apache" &>/dev/null; then
    WEB_USER="apache"
else
    WEB_USER="www-data"
fi

echo "  → Web user: $WEB_USER"

sudo chown -R $WEB_USER:$WEB_USER /var/www/wonten-teka/backend
sudo chmod -R 775 /var/www/wonten-teka/backend/storage
sudo chmod -R 775 /var/www/wonten-teka/backend/bootstrap/cache
sudo chmod 664 /var/www/wonten-teka/backend/database/database.sqlite

echo "  ✓ Permissions set"

echo ""
echo "[8/8] Configuring Nginx..."

# Detect PHP-FPM socket
FPM_SOCKET=$(find /run/php/ -name "*.sock" 2>/dev/null | head -1)
if [ -z "$FPM_SOCKET" ]; then
    FPM_SOCKET=$(find /var/run/php/ -name "*.sock" 2>/dev/null | head -1)
fi
if [ -z "$FPM_SOCKET" ]; then
    FPM_SOCKET="/run/php/php-fpm.sock"
fi

echo "  → PHP-FPM socket: $FPM_SOCKET"

# Create Nginx config
sudo tee /etc/nginx/sites-available/wonten-teka > /dev/null << NGINX_EOF
server {
    listen 80;
    server_name great-symbols-begin-freely.st.a.dcdg.xyz
                www.great-symbols-begin-freely.st.a.dcdg.xyz;

    root /var/www/wonten-teka/backend/public;
    index index.php index.html;

    charset utf-8;
    client_max_body_size 20M;

    # Laravel URL Rewriting
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    # PHP-FPM Handler
    location ~ \.php\$ {
        fastcgi_pass unix:${FPM_SOCKET};
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    # Block dotfiles (except .well-known for SSL)
    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Logging
    access_log /var/log/nginx/wonten-teka-access.log;
    error_log  /var/log/nginx/wonten-teka-error.log;
}
NGINX_EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/wonten-teka /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test & restart
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl restart php*-fpm

echo "  ✓ Nginx configured and restarted"

echo ""
echo "=============================================="
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""
echo "  🌐 API URL: https://www.great-symbols-begin-freely.st.a.dcdg.xyz/api"
echo "  🔑 Login:   POST /api/login"
echo "     Email:    employee1@example.com"
echo "     Password: password"
echo ""
echo "  Test: curl https://www.great-symbols-begin-freely.st.a.dcdg.xyz/api"
echo ""
PART2_EOF

    chmod +x /var/www/wonten-teka/deploy-part2.sh
    echo "  ✓ Part 2 script created at: /var/www/wonten-teka/deploy-part2.sh"
    
else
    echo "  ✓ Backend code found! Running setup..."
    bash /var/www/wonten-teka/deploy-part2.sh
fi
