#!/bin/bash
# Script to create .env file from template
# Usage: ./scripts/create-env-template.sh [environment]

ENVIRONMENT=${1:-development}

echo "Creating .env file for $ENVIRONMENT environment..."

if [ -f ".env" ]; then
    echo "Warning: .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

cp .env.example .env

echo ".env file created from .env.example"
echo "Please edit .env and update with your configuration values"



