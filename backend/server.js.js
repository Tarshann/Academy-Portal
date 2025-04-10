// Server setup for The Academy Basketball Website with Communication Portal

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const fileUpload = require('express-fileupload');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const config = require('../config/deployment_config');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, config.socketIO);

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: config.fileUpload.maxFileSize },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Connect to MongoDB
mongoose.connect(config.database.uri, config.database.options)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Set up web push notifications
webpush.setVapidDetails(
  config.pushNotifications.subject,
  config.pushNotifications.vapidPublicKey,
  config.pushNotifications.vapidPrivateKey
);

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, config.jwt.secret, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: 'Authentication required' });
  }
};

// API routes
// User routes
app.post('/api/auth/register', async (req, res) => {
  // Registration logic would be implemented here
  // This would use the auth_system.js functionality
});

app.post('/api/auth/login', async (req, res) => {
  // Login logic would be implemented here
  // This would use the auth_system.js functionality
});

app.post('/api/auth/forgot-password', async (req, res) => {
  // Password recovery logic would be implemented here
  // This would use the auth_system.js functionality
});

// Group routes
app.get('/api/groups', authenticateJWT, async (req, res) => {
  // Get user's groups logic would be implemented here
  // This would use the messaging_system.js functionality
});

app.post('/api/groups', authenticateJWT, async (req, res) => {
  // Create group logic would be implemented here
  // This would use the messaging_system.js functionality
});

// Message routes
app.get('/api/messages/:conversationId', authenticateJWT, async (req, res) => {
  // Get messages logic would be implemented here
  // This would use the messaging_system.js functionality
});

app.post('/api/messages', authenticateJWT, async (req, res) => {
  // Send message logic would be implemented here
  // This would use the messaging_system.js functionality
});

// Notification routes
app.get('/api/notifications', authenticateJWT, async (req, res) => {
  // Get notifications logic would be implemented here
  // This would use the messaging_system.js functionality
});

app.put('/api/notifications/:id/read', authenticateJWT, async (req, res) => {
  // Mark notification as read logic would be implemented here
  // This would use the messaging_system.js functionality
});

// Socket.io connection handler
io.use((socket, next) => {
  // Socket authentication middleware
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return next(new Error('Invalid or expired token'));
    }
    
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id}`);
  
  // Join user's rooms
  socket.join(`user:${socket.user.id}`);
  
  // Handle group messages
  socket.on('joinGroup', (groupId) => {
    socket.join(`group:${groupId}`);
  });
  
  socket.on('leaveGroup', (groupId) => {
    socket.leave(`group:${groupId}`);
  });
  
  socket.on('sendGroupMessage', (data) => {
    // Process and broadcast group message
    io.to(`group:${data.groupId}`).emit('newMessage', {
      ...data,
      sender: socket.user,
      sentAt: new Date()
    });
  });
  
  // Handle direct messages
  socket.on('sendDirectMessage', (data) => {
    // Process and send direct message
    io.to(`user:${data.recipientId}`).emit('newMessage', {
      ...data,
      sender: socket.user,
      sentAt: new Date()
    });
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    if (data.groupId) {
      socket.to(`group:${data.groupId}`).emit('userTyping', {
        groupId: data.groupId,
        userId: socket.user.id
      });
    } else if (data.recipientId) {
      socket.to(`user:${data.recipientId}`).emit('userTyping', {
        userId: socket.user.id
      });
    }
  });
  
  socket.on('stopTyping', (data) => {
    if (data.groupId) {
      socket.to(`group:${data.groupId}`).emit('userStoppedTyping', {
        groupId: data.groupId,
        userId: socket.user.id
      });
    } else if (data.recipientId) {
      socket.to(`user:${data.recipientId}`).emit('userStoppedTyping', {
        userId: socket.user.id
      });
    }
  });
  
  // Handle read receipts
  socket.on('markAsRead', (data) => {
    // Process read receipt
    // This would update the message in the database
    // and notify the sender
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
});

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index_with_portal.html'));
});

// Start server
const PORT = process.env.PORT || config.port;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
