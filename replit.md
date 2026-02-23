# Auto Plan - Fahrzeugverwaltung

## Overview
A Progressive Web App (PWA) for vehicle management with cloud synchronization support via Firebase.

## Project Structure
- `index.html` - Main HTML page
- `style.css` - Styles
- `script.js` - JavaScript logic
- `sw.js` - Service Worker for offline support
- `manifest.json` - PWA manifest
- `icon.svg` - App icon
- `404.hmtl` - 404 error page

## Technology Stack
- Pure HTML/CSS/JavaScript (no build step)
- PWA with Service Worker
- Optional Firebase integration for cloud sync

## Development
The app runs as a static site on port 5000 using Python's built-in HTTP server.

## Deployment
Configured as a static deployment serving files from the root directory.

## Recent Changes
- 2026-01-01: Initial import and Replit environment setup
  - Updated manifest.json paths to work from root
  - Configured static file server workflow on port 5000
  - Set up static deployment configuration
