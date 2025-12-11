#!/bin/bash

echo "🚀 Setting up AI Trading Enterprise Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate secure keys
echo "🔐 Generating secure keys..."
npm run generate-keys

# Copy environment file
if [ ! -f .env.local ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your actual API keys"
else
    echo "✅ Environment file already exists"
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your API keys"
echo "2. Run: npm run db:migrate"
echo "3. Run: npm run db:seed" 
echo "4. Run: npm run dev"
echo ""
echo "Your application will be available at: http://localhost:3000"