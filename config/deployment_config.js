// Deployment configuration for The Academy website with communication portal

// Server configuration
const serverConfig = {
  // Server settings
  port: process.env.PORT || 3000,
  host: '0.0.0.0',
  
  // Environment settings
  nodeEnv: process.env.NODE_ENV || 'production',
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/academy_portal',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    }
  },
  
  // JWT configuration for authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '7d'
  },
  
  // CORS configuration
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // File upload configuration
  fileUpload: {
    uploadDir: './uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  },
  
  // Email configuration for notifications
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-email-password'
    },
    from: process.env.EMAIL_FROM || 'The Academy <noreply@academytn.com>'
  },
  
  // Push notification configuration
  pushNotifications: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'your-vapid-public-key',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || 'your-vapid-private-key',
    subject: 'mailto:contact@academytn.com'
  },
  
  // Socket.io configuration for real-time messaging
  socketIO: {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  }
};

module.exports = serverConfig;
