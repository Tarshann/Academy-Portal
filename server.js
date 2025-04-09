const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Log directory structure for debugging
console.log('Current directory:', __dirname);
console.log('Files in current directory:', require('fs').readdirSync(__dirname));

// Serve static files from the public directory
app.use(express.static('public'));

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Serve the main HTML file for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
