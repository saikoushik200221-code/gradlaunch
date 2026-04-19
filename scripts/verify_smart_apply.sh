#!/bin/bash
echo "🔍 Verifying Smart Apply Critical Fixes..."

# 1. Check NPM packages
echo "Verifying backend packages..."
if grep -q "ioredis" "backend/package.json"; then
  echo "✅ ioredis installed"
else
  echo "❌ ioredis missing"
fi

# 2. Check Database Schema Columns
echo "Checking SQLite database schema..."
if [ -f "backend/database.sqlite" ]; then
    DB_FILE="backend/database.sqlite"
elif [ -f "backend/data.db" ]; then
    DB_FILE="backend/data.db"
elif [ -f "backend/gradlaunch.db" ]; then
    DB_FILE="backend/gradlaunch.db"
else
  echo "⚠️ Could not locate SQLite DB file automatically to test schema changes."
fi

if [ -n "$DB_FILE" ]; then
    sqlite3 "$DB_FILE" "PRAGMA table_info(jobs);" | grep -q "salary_currency" && echo "✅ Jobs table migrated successfully" || echo "❌ Jobs table missing columns"
    sqlite3 "$DB_FILE" "PRAGMA table_info(applications);" | grep -q "automation_log" && echo "✅ Applications table migrated successfully" || echo "❌ Applications table missing columns"
fi

echo "✅ Verification script executed!"
