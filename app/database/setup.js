// Database setup script for The Academy Basketball Website with Communication Portal

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/deployment_config');

// Connect to MongoDB
mongoose.connect(config.database.uri, config.database.options)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define schemas
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'coach', 'parent', 'player'], default: 'parent' },
  profileImage: { type: String },
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  pushSubscription: { type: Object },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  groupImage: { type: String },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments: [{
    fileName: { type: String },
    filePath: { type: String },
    fileType: { type: String },
    fileSize: { type: Number }
  }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['message', 'group_invite', 'mention', 'announcement', 'file'], required: true },
  content: { type: String, required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);
const Message = mongoose.model('Message', messageSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Create admin user
async function createAdminUser() {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@academytn.com' });
    
    if (!adminExists) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      // Create admin user
      const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@academytn.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      await admin.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Create sample groups
async function createSampleGroups() {
  try {
    // Get admin user
    const admin = await User.findOne({ email: 'admin@academytn.com' });
    
    if (!admin) {
      console.error('Admin user not found');
      return;
    }
    
    // Check if groups already exist
    const groupsExist = await Group.findOne({ name: '4th Grade Boys Team' });
    
    if (!groupsExist) {
      // Create sample groups
      const groups = [
        {
          name: '4th Grade Boys Team',
          description: 'Communication group for 4th grade boys basketball team',
          createdBy: admin._id,
          members: [{ user: admin._id, role: 'admin' }]
        },
        {
          name: '5th Grade Girls Team',
          description: 'Communication group for 5th grade girls basketball team',
          createdBy: admin._id,
          members: [{ user: admin._id, role: 'admin' }]
        },
        {
          name: 'Coaches Discussion',
          description: 'Private group for coaches to discuss training plans',
          createdBy: admin._id,
          members: [{ user: admin._id, role: 'admin' }]
        }
      ];
      
      await Group.insertMany(groups);
      console.log('Sample groups created successfully');
    } else {
      console.log('Sample groups already exist');
    }
  } catch (error) {
    console.error('Error creating sample groups:', error);
  }
}

// Run setup
async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    await createAdminUser();
    await createSampleGroups();
    
    console.log('Database setup completed successfully');
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Database setup failed:', error);
  }
}

// Execute setup
setupDatabase();
