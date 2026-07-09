#!/bin/sh
set -e

DB_FILE="/app/backend/data/warunk.db"

echo "Checking database state..."

if [ ! -f "$DB_FILE" ]; then
  echo "🚀 Database not found at $DB_FILE. Initializing first-run database setup (migrate & seed)..."
  # Run the full setup (migration and seeding demo data)
  npm run db:setup --prefix /app/backend
else
  echo "🔄 Database found at $DB_FILE. Checking and running any outstanding migrations..."
  # Run only the migrations to prevent wiping production database
  npm run db:migrate --prefix /app/backend
fi

echo "🚀 Starting Waru.NK POS Backend API..."
# Start the backend node process in the background
node /app/backend/dist/index.js &

echo "🚀 Starting Nginx..."
# Start Nginx in the foreground to keep the container running
nginx -g "daemon off;"
