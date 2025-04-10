// Simplified server.js file with minimal dependencies
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

// Basic API endpoint for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Error handling for 404 - page not found
app.use((req, res) => {
  res.status(404).send('Page not found. Please check the URL and try again.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
