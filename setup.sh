#!/bin/bash

echo "🚀 Setting up Grounded Backend..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please update the .env file with your actual credentials before running the server!"
    echo ""
else
    echo "✓ .env file exists"
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a Supabase project at https://supabase.com"
echo "2. Update your .env file with Supabase credentials (see SUPABASE_SETUP.md)"
echo "3. Run migrations: npm run migrate:up (or use Supabase SQL Editor)"
echo "4. Start development server: npm run dev"
echo ""
echo "📚 See SUPABASE_SETUP.md for detailed Supabase configuration"
echo ""
