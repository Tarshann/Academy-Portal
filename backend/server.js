const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

// API routes would go here
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Special route for login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

// Serve the main HTML file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling for 404 - page not found
app.use((req, res) => {
  res.status(404).send('Page not found. Please check the URL and try again.');
});

// Error handling for server errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke! Please try again later.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});