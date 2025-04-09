const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Log the current directory structure for debugging
console.log('Current directory:', __dirname);
console.log('Files in current directory:', fs.readdirSync(__dirname));
console.log('Parent directory:', path.join(__dirname, '..'));
console.log('Files in parent directory:', fs.readdirSync(path.join(__dirname, '..')));

// Try multiple static file locations
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '../..')));

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Serve the main HTML file for any other routes - try multiple locations
app.get('*', (req, res) => {
  const possiblePaths = [
    path.join(__dirname, '../frontend/index.html'),
    path.join(__dirname, '../index.html'),
    path.join(__dirname, '../../frontend/index.html'),
    path.join(__dirname, 'index.html')
  ];
  
  // Try each path until we find one that exists
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    } catch (err) {
      console.error(`Error checking path ${filePath}:`, err);
    }
  }
  
  // If no file is found, send a basic HTML response
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>The Academy Communication Portal</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; background-color: #000; color: #fff; }
        h1 { color: #0a3161; }
      </style>
    </head>
    <body>
      <h1>The Academy Communication Portal</h1>
      <p>Welcome to The Academy's communication portal. This site is currently under development.</p>
      <p>Server is running but index.html was not found.</p>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
