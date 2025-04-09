// Messaging and Notification System for The Academy Communication Portal

// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require('socket.io');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Message model schema
const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    fileSize: Number
  }],
  sentAt: {
    type: Date,
    default: Date.now
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
});

const Message = mongoose.model('Message', MessageSchema);

// Group model schema
const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  groupImage: {
    type: String,
    default: '/images/default-group.png'
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    notificationSettings: {
      muted: {
        type: Boolean,
        default: false
      },
      mentions: {
        type: Boolean,
        default: true
      }
    }
  }]
});

const Group = mongoose.model('Group', GroupSchema);

// Notification model schema
const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['message', 'group_invite', 'mention', 'announcement', 'file'],
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  content: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.model('Notification', NotificationSchema);

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for uploads
const fileFilter = (req, file, cb) => {
  // Allow common file types
  const allowedFileTypes = [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.svg',
    // Other
    '.zip', '.csv'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize Socket.io
const initializeSocket = (server) => {
  const io = socketio(server);
  
  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.user.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Join user to their personal room
    socket.join(socket.userId);
    
    // Join user to group rooms they're a member of
    Group.find({ 'members.user': socket.userId })
      .then(groups => {
        groups.forEach(group => {
          socket.join(`group:${group._id}`);
        });
      })
      .catch(err => console.error(err));
    
    // Handle new message
    socket.on('sendMessage', async (data) => {
      try {
        const { groupId, recipientId, content, attachments } = data;
        
        // Create new message
        const newMessage = new Message({
          sender: socket.userId,
          content,
          attachments: attachments || []
        });
        
        // Set group or recipient
        if (groupId) {
          newMessage.group = groupId;
        } else if (recipientId) {
          newMessage.recipient = recipientId;
        }
        
        await newMessage.save();
        
        // Populate sender info
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'username firstName lastName profileImage')
          .populate('group', 'name')
          .populate('recipient', 'username firstName lastName profileImage');
        
        // Emit to appropriate recipients
        if (groupId) {
          // Get group members for notifications
          const group = await Group.findById(groupId);
          
          // Emit to group room
          io.to(`group:${groupId}`).emit('newMessage', populatedMessage);
          
          // Create notifications for group members
          group.members.forEach(async (member) => {
            // Skip notification for sender
            if (member.user.toString() === socket.userId) return;
            
            // Skip if user has muted the group
            if (member.notificationSettings.muted) return;
            
            // Create notification
            const notification = new Notification({
              recipient: member.user,
              type: 'message',
              sender: socket.userId,
              group: groupId,
              message: newMessage._id,
              content: `New message in ${group.name}`
            });
            
            await notification.save();
            
            // Emit notification to user
            io.to(member.user.toString()).emit('newNotification', notification);
          });
        } else if (recipientId) {
          // Emit to sender and recipient
          io.to(socket.userId).emit('newMessage', populatedMessage);
          io.to(recipientId).emit('newMessage', populatedMessage);
          
          // Create notification for recipient
          const notification = new Notification({
            recipient: recipientId,
            type: 'message',
            sender: socket.userId,
            message: newMessage._id,
            content: 'New private message'
          });
          
          await notification.save();
          
          // Emit notification to recipient
          io.to(recipientId).emit('newNotification', notification);
        }
      } catch (err) {
        console.error(err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
      const { groupId, recipientId } = data;
      
      if (groupId) {
        socket.to(`group:${groupId}`).emit('userTyping', {
          userId: socket.userId,
          groupId
        });
      } else if (recipientId) {
        socket.to(recipientId).emit('userTyping', {
          userId: socket.userId
        });
      }
    });
    
    // Handle stop typing
    socket.on('stopTyping', (data) => {
      const { groupId, recipientId } = data;
      
      if (groupId) {
        socket.to(`group:${groupId}`).emit('userStoppedTyping', {
          userId: socket.userId,
          groupId
        });
      } else if (recipientId) {
        socket.to(recipientId).emit('userStoppedTyping', {
          userId: socket.userId
        });
      }
    });
    
    // Handle read receipts
    socket.on('markAsRead', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }
        
        // Check if user already marked as read
        const alreadyRead = message.readBy.some(
          read => read.user.toString() === socket.userId
        );
        
        if (!alreadyRead) {
          message.readBy.push({
            user: socket.userId,
            readAt: Date.now()
          });
          
          await message.save();
          
          // Emit read receipt to sender
          io.to(message.sender.toString()).emit('messageRead', {
            messageId,
            userId: socket.userId,
            readAt: Date.now()
          });
        }
      } catch (err) {
        console.error(err);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
  
  return io;
};

// API Routes

// Create a new group
router.post(
  '/groups',
  [
    auth,
    [
      check('name', 'Group name is required').not().isEmpty(),
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { name, description, isPrivate, members } = req.body;
      
      // Create new group
      const newGroup = new Group({
        name,
        description: description || '',
        createdBy: req.user.id,
        isPrivate: isPrivate || false,
        members: [
          {
            user: req.user.id,
            role: 'admin'
          }
        ]
      });
      
      // Add members if provided
      if (members && members.length > 0) {
        members.forEach(memberId => {
          if (memberId !== req.user.id) {
            newGroup.members.push({
              user: memberId,
              role: 'member'
            });
          }
        });
      }
      
      await newGroup.save();
      
      // Populate creator info
      const group = await Group.findById(newGroup._id)
        .populate('createdBy', 'username firstName lastName')
        .populate('members.user', 'username firstName lastName profileImage');
      
      res.json(group);
      
      // Create notifications for added members
      if (members && members.length > 0) {
        members.forEach(async (memberId) => {
          if (memberId !== req.user.id) {
            const notification = new Notification({
              recipient: memberId,
              type: 'group_invite',
              sender: req.user.id,
              group: newGroup._id,
              content: `You were added to the group: ${name}`
            });
            
            await notification.save();
            
            // Emit notification to user via Socket.io
            req.app.get('io').to(memberId).emit('newNotification', notification);
          }
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Get all groups for current user
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.user.id })
      .populate('createdBy', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName profileImage')
      .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a specific group
router.get('/groups/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName profileImage');
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is a member
    const isMember = group.members.some(
      member => member.user._id.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ msg: 'Not authorized to access this group' });
    }
    
    res.json(group);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// Update a group
router.put('/groups/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is admin
    const memberIndex = group.members.findIndex(
      member => member.user.toString() === req.user.id && member.role === 'admin'
    );
    
    if (memberIndex === -1) {
      return res.status(403).json({ msg: 'Not authorized to update this group' });
    }
    
    const { name, description, isPrivate, groupImage } = req.body;
    
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (isPrivate !== undefined) group.isPrivate = isPrivate;
    if (groupImage) group.groupImage = groupImage;
    
    await group.save();
    
    // Populate updated group
    const updatedGroup = await Group.findById(req.params.id)
      .populate('createdBy', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName profileImage');
    
    res.json(updatedGroup);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// Add member to group
router.post('/groups/:id/members', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is admin
    const isAdmin = group.members.some(
      member => member.user.toString() === req.user.id && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to add members' });
    }
    
    const { userId } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if user is already a member
    const isMember = group.members.some(
      member => member.user.toString() === userId
    );
    
    if (isMember) {
      return res.status(400).json({ msg: 'User is already a member' });
    }
    
    // Add user to group
    group.members.push({
      user: userId,
      role: 'member'
    });
    
    await group.save();
    
    // Create notification for added user
    const notification = new Notification({
      recipient: userId,
      type: 'group_invite',
      sender: req.user.id,
      group: group._id,
      content: `You were added to the group: ${group.name}`
    });
    
    await notification.save();
    
    // Emit notification to user via Socket.io
    req.app.get('io').to(userId).emit('newNotification', notification);
    
    // Populate updated group
    const updatedGroup = await Group.findById(req.params.id)
      .populate('createdBy', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName profileImage');
    
    res.json(updatedGroup);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group or user not found' });
    }
    res.status(500).send('Server error');
  }
});

// Remove member from group
router.delete('/groups/:groupId/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is admin or removing self
    const isAdmin = group.members.some(
      member => member.user.toString() === req.user.id && member.role === 'admin'
    );
    
    const isSelf = req.user.id === req.params.userId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ msg: 'Not authorized to remove members' });
    }
    
    // Remove user from group
    group.members = group.members.filter(
      member => member.user.toString() !== req.params.userId
    );
    
    await group.save();
    
    // Populate updated group
    const updatedGroup = await Group.findById(req.params.groupId)
      .populate('createdBy', 'username firstName lastName')
      .populate('members.user', 'username firstName lastName profileImage');
    
    res.json(updatedGroup);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group or user not found' });
    }
    res.status(500).send('Server error');
  }
});

// Get messages for a group
router.get('/groups/:id/messages', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is a member
    const isMember = group.members.some(
      member => member.user.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ msg: 'Not authorized to access this group' });
    }
    
    // Get messages with pagination
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await Message.find({ group: req.params.id })
      .sort({ sentAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate('sender', 'username firstName lastName profileImage')
      .populate('readBy.user', 'username firstName lastName');
    
    res.json(messages.reverse());
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// Get private messages between users
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    // Get messages with pagination
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user.id }
      ]
    })
      .sort({ sentAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate('sender', 'username firstName lastName profileImage')
      .populate('recipient', 'username firstName lastName profileImage')
      .populate('readBy.user', 'username firstName lastName');
    
    res.json(messages.reverse());
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// Send a message with file attachment
router.post(
  '/messages',
  [
    auth,
    upload.array('files', 5),
    [
      check('content', 'Message content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { groupId, recipientId, content } = req.body;
      
      // Validate either groupId or recipientId is provided
      if (!groupId && !recipientId) {
        return res.status(400).json({ msg: 'Group ID or recipient ID is required' });
      }
      
      // If group message, check if user is a member
      if (groupId) {
        const group = await Group.findById(groupId);
        
        if (!group) {
          return res.status(404).json({ msg: 'Group not found' });
        }
        
        const isMember = group.members.some(
          member => member.user.toString() === req.user.id
        );
        
        if (!isMember) {
          return res.status(403).json({ msg: 'Not authorized to send messages to this group' });
        }
      }
      
      // Process file attachments
      const attachments = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          attachments.push({
            fileName: file.originalname,
            filePath: file.path,
            fileType: file.mimetype,
            fileSize: file.size
          });
        });
      }
      
      // Create new message
      const newMessage = new Message({
        sender: req.user.id,
        content,
        attachments
      });
      
      // Set group or recipient
      if (groupId) {
        newMessage.group = groupId;
      } else if (recipientId) {
        newMessage.recipient = recipientId;
      }
      
      await newMessage.save();
      
      // Populate sender info
      const message = await Message.findById(newMessage._id)
        .populate('sender', 'username firstName lastName profileImage')
        .populate('group', 'name')
        .populate('recipient', 'username firstName lastName profileImage');
      
      res.json(message);
      
      // Emit message via Socket.io
      const io = req.app.get('io');
      
      if (groupId) {
        // Get group members for notifications
        const group = await Group.findById(groupId);
        
        // Emit to group room
        io.to(`group:${groupId}`).emit('newMessage', message);
        
        // Create notifications for group members
        group.members.forEach(async (member) => {
          // Skip notification for sender
          if (member.user.toString() === req.user.id) return;
          
          // Skip if user has muted the group
          if (member.notificationSettings.muted) return;
          
          // Create notification
          const notification = new Notification({
            recipient: member.user,
            type: 'message',
            sender: req.user.id,
            group: groupId,
            message: newMessage._id,
            content: `New message in ${group.name}`
          });
          
          await notification.save();
          
          // Emit notification to user
          io.to(member.user.toString()).emit('newNotification', notification);
        });
      } else if (recipientId) {
        // Emit to sender and recipient
        io.to(req.user.id).emit('newMessage', message);
        io.to(recipientId).emit('newMessage', message);
        
        // Create notification for recipient
        const notification = new Notification({
          recipient: recipientId,
          type: 'message',
          sender: req.user.id,
          message: newMessage._id,
          content: 'New private message'
        });
        
        await notification.save();
        
        // Emit notification to recipient
        io.to(recipientId).emit('newNotification', notification);
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Get all notifications for current user
router.get('/notifications', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;
    
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate('sender', 'username firstName lastName profileImage')
      .populate('group', 'name')
      .populate({
        path: 'message',
        select: 'content attachments',
        populate: {
          path: 'sender',
          select: 'username firstName lastName'
        }
      });
    
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    
    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.status(500).send('Server error');
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    
    res.json({ msg: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get unread notification count
router.get('/notifications/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = {
  router,
  initializeSocket
};
