const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/academy-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user.id;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.userId);
  
  // Join user's personal room for notifications
  socket.join(`user_${socket.userId}`);
  
  // Handle joining conversation rooms
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });
  
  // Handle leaving conversation rooms
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
  });
  
  // Handle typing indicators
  socket.on('typing', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('typing', {
      user: socket.userId,
      conversation: conversationId
    });
  });
  
  // Handle stop typing indicators
  socket.on('stop_typing', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('stop_typing', {
      user: socket.userId,
      conversation: conversationId
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.userId);
  });
});

// API routes
const authRoutes = require('./auth_system');
const userRoutes = require('./user_model');
const conversationRoutes = require('./conversation_model');
const messageRoutes = require('./messaging_system');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

// Serve the main HTML file for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'messaging_dashboard.html'));
});

// Create public directory structure
const fs = require('fs');
const publicDir = path.join(__dirname, 'public');
const jsDir = path.join(publicDir, 'js');
const cssDir = path.join(publicDir, 'css');
const imagesDir = path.join(publicDir, 'images');
const uploadsDir = path.join(publicDir, 'uploads');
const messageUploadsDir = path.join(uploadsDir, 'messages');

// Create directories if they don't exist
[publicDir, jsDir, cssDir, imagesDir, uploadsDir, messageUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy frontend files to public directory
fs.copyFileSync(path.join(__dirname, 'messaging_dashboard.html'), path.join(publicDir, 'messaging_dashboard.html'));
fs.copyFileSync(path.join(__dirname, 'index_with_auth.html'), path.join(publicDir, 'index.html'));
fs.copyFileSync(path.join(__dirname, 'updated_messaging_frontend.js'), path.join(jsDir, 'messaging_frontend.js'));
fs.copyFileSync(path.join(__dirname, 'auth_frontend.js'), path.join(jsDir, 'auth_frontend.js'));
fs.copyFileSync(path.join(__dirname, 'messaging_styles.css'), path.join(cssDir, 'messaging_styles.css'));
fs.copyFileSync(path.join(__dirname, 'auth_styles.css'), path.join(cssDir, 'auth_styles.css'));

// Export Socket.IO instance for use in other modules
module.exports = {
  getIO: () => io
};

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
