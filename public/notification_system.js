// Notification System for The Academy Communication Portal
// This file handles the notification functionality for real-time alerts

// Dependencies
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const config = require('../config/config');
const nodemailer = require('nodemailer');
const webpush = require('web-push');

// Configure web push
webpush.setVapidDetails(
  'mailto:admin@academytn.com',
  config.webPush.publicKey,
  config.webPush.privateKey
);

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password
  }
});

// Notification types
const NOTIFICATION_TYPES = {
  NEW_MESSAGE: 'new_message',
  MENTION: 'mention',
  ADDED_TO_CONVERSATION: 'added_to_conversation',
  REMOVED_FROM_CONVERSATION: 'removed_from_conversation',
  CONVERSATION_ARCHIVED: 'conversation_archived',
  NEW_REACTION: 'new_reaction',
  APPROVAL_STATUS: 'approval_status'
};

/**
 * Create a notification
 * @param {Object} options - Notification options
 * @param {String} options.type - Notification type
 * @param {String} options.userId - User ID to notify
 * @param {String} options.senderId - User ID who triggered the notification
 * @param {String} options.conversationId - Conversation ID (if applicable)
 * @param {String} options.messageId - Message ID (if applicable)
 * @param {String} options.content - Notification content
 * @returns {Promise<Object>} - Created notification
 */
async function createNotification(options) {
  try {
    const { type, userId, senderId, conversationId, messageId, content } = options;
    
    // Get user to check notification preferences
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Skip if user is the sender
    if (senderId && userId === senderId) {
      return null;
    }
    
    // Create notification object
    const notification = {
      type,
      userId,
      senderId,
      conversationId,
      messageId,
      content,
      createdAt: new Date(),
      isRead: false
    };
    
    // Store notification in database
    // This would typically use a Notification model
    // For now, we'll just return the notification object
    
    // Send real-time notification via Socket.IO
    sendRealTimeNotification(notification);
    
    // Send push notification if enabled
    if (user.notificationSettings.push) {
      sendPushNotification(notification, user);
    }
    
    // Send email notification if enabled
    if (user.notificationSettings.email) {
      sendEmailNotification(notification, user);
    }
    
    // Send SMS notification if enabled (for important notifications only)
    if (user.notificationSettings.sms && isImportantNotification(type)) {
      sendSmsNotification(notification, user);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Send real-time notification via Socket.IO
 * @param {Object} notification - Notification object
 */
function sendRealTimeNotification(notification) {
  try {
    // Get Socket.IO instance
    const io = require('../socket').getIO();
    
    // Emit notification to specific user
    io.to(`user_${notification.userId}`).emit('notification', notification);
  } catch (error) {
    console.error('Error sending real-time notification:', error);
  }
}

/**
 * Send push notification
 * @param {Object} notification - Notification object
 * @param {Object} user - User object
 */
async function sendPushNotification(notification, user) {
  try {
    // Skip if user has no push subscriptions
    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }
    
    // Format notification content
    const title = getNotificationTitle(notification);
    const body = getNotificationBody(notification);
    const icon = '/images/logo.png';
    const data = {
      url: getNotificationUrl(notification),
      notification: notification
    };
    
    // Prepare payload
    const payload = JSON.stringify({
      title,
      body,
      icon,
      data
    });
    
    // Send to all user's push subscriptions
    const sendPromises = user.pushSubscriptions.map(subscription => {
      return webpush.sendNotification(subscription, payload)
        .catch(error => {
          // If subscription is expired or invalid, remove it
          if (error.statusCode === 404 || error.statusCode === 410) {
            removeInvalidSubscription(user._id, subscription);
          }
          console.error('Error sending push notification:', error);
        });
    });
    
    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Send email notification
 * @param {Object} notification - Notification object
 * @param {Object} user - User object
 */
async function sendEmailNotification(notification, user) {
  try {
    // Format notification content
    const subject = getNotificationTitle(notification);
    const text = getNotificationBody(notification);
    const html = getNotificationHtml(notification);
    
    // Send email
    await transporter.sendMail({
      from: `"The Academy" <${config.email.user}>`,
      to: user.email,
      subject,
      text,
      html
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

/**
 * Send SMS notification
 * @param {Object} notification - Notification object
 * @param {Object} user - User object
 */
async function sendSmsNotification(notification, user) {
  try {
    // This would typically use a service like Twilio
    // For now, we'll just log the SMS content
    const message = getNotificationBody(notification);
    console.log(`SMS to ${user.phone}: ${message}`);
  } catch (error) {
    console.error('Error sending SMS notification:', error);
  }
}

/**
 * Check if notification is important enough for SMS
 * @param {String} type - Notification type
 * @returns {Boolean} - Whether notification is important
 */
function isImportantNotification(type) {
  return [
    NOTIFICATION_TYPES.ADDED_TO_CONVERSATION,
    NOTIFICATION_TYPES.APPROVAL_STATUS
  ].includes(type);
}

/**
 * Get notification title
 * @param {Object} notification - Notification object
 * @returns {String} - Notification title
 */
async function getNotificationTitle(notification) {
  try {
    switch (notification.type) {
      case NOTIFICATION_TYPES.NEW_MESSAGE:
        const conversation = await Conversation.findById(notification.conversationId);
        return `New message in ${conversation.name}`;
      
      case NOTIFICATION_TYPES.MENTION:
        return 'You were mentioned in a message';
      
      case NOTIFICATION_TYPES.ADDED_TO_CONVERSATION:
        return 'You were added to a conversation';
      
      case NOTIFICATION_TYPES.REMOVED_FROM_CONVERSATION:
        return 'You were removed from a conversation';
      
      case NOTIFICATION_TYPES.CONVERSATION_ARCHIVED:
        return 'A conversation was archived';
      
      case NOTIFICATION_TYPES.NEW_REACTION:
        return 'New reaction to your message';
      
      case NOTIFICATION_TYPES.APPROVAL_STATUS:
        return 'Account approval status updated';
      
      default:
        return 'New notification from The Academy';
    }
  } catch (error) {
    console.error('Error getting notification title:', error);
    return 'New notification from The Academy';
  }
}

/**
 * Get notification body
 * @param {Object} notification - Notification object
 * @returns {String} - Notification body
 */
async function getNotificationBody(notification) {
  try {
    let sender = { name: 'Someone' };
    if (notification.senderId) {
      sender = await User.findById(notification.senderId).select('name');
    }
    
    switch (notification.type) {
      case NOTIFICATION_TYPES.NEW_MESSAGE:
        const conversation = await Conversation.findById(notification.conversationId);
        return `${sender.name} sent a message in ${conversation.name}: ${notification.content.substring(0, 50)}${notification.content.length > 50 ? '...' : ''}`;
      
      case NOTIFICATION_TYPES.MENTION:
        return `${sender.name} mentioned you in a message: ${notification.content.substring(0, 50)}${notification.content.length > 50 ? '...' : ''}`;
      
      case NOTIFICATION_TYPES.ADDED_TO_CONVERSATION:
        return `${sender.name} added you to ${notification.content}`;
      
      case NOTIFICATION_TYPES.REMOVED_FROM_CONVERSATION:
        return `${sender.name} removed you from ${notification.content}`;
      
      case NOTIFICATION_TYPES.CONVERSATION_ARCHIVED:
        return `${sender.name} archived the conversation: ${notification.content}`;
      
      case NOTIFICATION_TYPES.NEW_REACTION:
        return `${sender.name} reacted to your message with ${notification.content}`;
      
      case NOTIFICATION_TYPES.APPROVAL_STATUS:
        return notification.content;
      
      default:
        return notification.content || 'You have a new notification';
    }
  } catch (error) {
    console.error('Error getting notification body:', error);
    return notification.content || 'You have a new notification';
  }
}

/**
 * Get HTML version of notification for emails
 * @param {Object} notification - Notification object
 * @returns {String} - HTML content
 */
async function getNotificationHtml(notification) {
  try {
    const title = await getNotificationTitle(notification);
    const body = await getNotificationBody(notification);
    const url = getNotificationUrl(notification);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #0a3161;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
            background-color: #f9f9f9;
          }
          .button {
            display: inline-block;
            background-color: #0a3161;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>The Academy</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>${body}</p>
            <a href="${url}" class="button">View in Portal</a>
          </div>
          <div class="footer">
            <p>This is an automated message from The Academy Communication Portal.</p>
            <p>If you no longer wish to receive these emails, you can update your notification settings in the portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    console.error('Error generating notification HTML:', error);
    return `<p>You have a new notification from The Academy. Please log in to view it.</p>`;
  }
}

/**
 * Get URL to redirect user to when clicking notification
 * @param {Object} notification - Notification object
 * @returns {String} - URL
 */
function getNotificationUrl(notification) {
  const baseUrl = config.appUrl;
  
  switch (notification.type) {
    case NOTIFICATION_TYPES.NEW_MESSAGE:
    case NOTIFICATION_TYPES.MENTION:
      return `${baseUrl}/messages?conversation=${notification.conversationId}&message=${notification.messageId}`;
    
    case NOTIFICATION_TYPES.ADDED_TO_CONVERSATION:
    case NOTIFICATION_TYPES.REMOVED_FROM_CONVERSATION:
    case NOTIFICATION_TYPES.CONVERSATION_ARCHIVED:
      return `${baseUrl}/messages?conversation=${notification.conversationId}`;
    
    case NOTIFICATION_TYPES.NEW_REACTION:
      return `${baseUrl}/messages?conversation=${notification.conversationId}&message=${notification.messageId}`;
    
    case NOTIFICATION_TYPES.APPROVAL_STATUS:
      return `${baseUrl}/login`;
    
    default:
      return baseUrl;
  }
}

/**
 * Remove invalid push subscription
 * @param {String} userId - User ID
 * @param {Object} subscription - Push subscription to remove
 */
async function removeInvalidSubscription(userId, subscription) {
  try {
    await User.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
    );
  } catch (error) {
    console.error('Error removing invalid subscription:', error);
  }
}

/**
 * Create notification for new message
 * @param {Object} message - Message object
 * @param {Object} conversation - Conversation object
 */
async function notifyNewMessage(message, conversation) {
  try {
    // Get all participants except sender
    const participants = conversation.participants
      .filter(p => p.isActive && p.user.toString() !== message.sender.toString())
      .map(p => p.user.toString());
    
    // Skip if no participants to notify
    if (participants.length === 0) {
      return;
    }
    
    // Check for mentions in message
    const mentions = extractMentions(message.content);
    
    // Create notifications for each participant
    for (const userId of participants) {
      // Check if user has muted this conversation
      const participant = conversation.participants.find(p => 
        p.user.toString() === userId && p.isActive
      );
      
      if (participant && participant.isMuted) {
        continue; // Skip notification for muted conversation
      }
      
      // Check if user is mentioned
      const isMentioned = mentions.includes(userId);
      
      // Create notification
      await createNotification({
        type: isMentioned ? NOTIFICATION_TYPES.MENTION : NOTIFICATION_TYPES.NEW_MESSAGE,
        userId,
        senderId: message.sender,
        conversationId: conversation._id,
        messageId: message._id,
        content: message.content
      });
    }
  } catch (error) {
    console.error('Error notifying about new message:', error);
  }
}

/**
 * Extract user mentions from message content
 * @param {String} content - Message content
 * @returns {Array} - Array of user IDs mentioned
 */
function extractMentions(content) {
  try {
    // Extract @userId mentions
    // This is a simplified version, in reality would need more robust parsing
    const mentionRegex = /@([a-f\d]{24})/g;
    const matches = content.match(mentionRegex) || [];
    
    return matches.map(match => match.substring(1));
  } catch (error) {
    console.error('Error extracting mentions:', error);
    return [];
  }
}

/**
 * Notify user about being added to a conversation
 * @param {String} userId - User ID added
 * @param {String} addedBy - User ID who added
 * @param {Object} conversation - Conversation object
 */
async function notifyAddedToConversation(userId, addedBy, conversation) {
  try {
    await createNotification({
      type: NOTIFICATION_TYPES.ADDED_TO_CONVERSATION,
      userId,
      senderId: addedBy,
      conversationId: conversation._id,
      content: conversation.name
    });
  } catch (error) {
    console.error('Error notifying about being added to conversation:', error);
  }
}

/**
 * Notify user about being removed from a conversation
 * @param {String} userId - User ID removed
 * @param {String} removedBy - User ID who removed
 * @param {Object} conversation - Conversation object
 */
async function notifyRemovedFromConversation(userId, removedBy, conversation) {
  try {
    await createNotification({
      type: NOTIFICATION_TYPES.REMOVED_FROM_CONVERSATION,
      userId,
      senderId: removedBy,
      conversationId: conversation._id,
      content: conversation.name
    });
  } catch (error) {
    console.error('Error notifying about being removed from conversation:', error);
  }
}

/**
 * Notify participants about conversation being archived
 * @param {Object} conversation - Conversation object
 * @param {String} archivedBy - User ID who archived
 */
async function notifyConversationArchived(conversation, archivedBy) {
  try {
    // Get all active participants except the user who archived
    const participants = conversation.participants
      .filter(p => p.isActive && p.user.toString() !== archivedBy)
      .map(p => p.user.toString());
    
    // Skip if no participants to notify
    if (participants.length === 0) {
      return;
    }
    
    // Create notifications for each participant
    for (const userId of participants) {
      await createNotification({
        type: NOTIFICATION_TYPES.CONVERSATION_ARCHIVED,
        userId,
        senderId: archivedBy,
        conversationId: conversation._id,
        content: conversation.name
      });
    }
  } catch (error) {
    console.error('Error notifying about conversation being archived:', error);
  }
}

/**
 * Notify user about new reaction to their message
 * @param {Object} message - Message object
 * @param {Object} reaction - Reaction object
 * @param {Object} conversation - Conversation object
 */
async function notifyNewReaction(message, reaction, conversation) {
  try {
    // Skip if message sender is the same as reaction user
    if (message.sender.toString() === reaction.user.toString()) {
      return;
    }
    
    // Get reaction emoji
    const reactionEmojis = {
      like: '👍',
      love: '❤️',
      laugh: '😂',
      wow: '😮',
      sad: '😢',
      angry: '😡'
    };
    
    const emoji = reactionEmojis[reaction.reaction] || reaction.reaction;
    
    // Create notification
    await createNotification({
      type: NOTIFICATION_TYPES.NEW_REACTION,
      userId: message.sender,
      senderId: reaction.user,
      conversationId: conversation._id,
      messageId: message._id,
      content: emoji
    });
  } catch (error) {
    console.error('Error notifying about new reaction:', error);
  }
}

/**
 * Notify user about account approval status
 * @param {String} userId - User ID
 * @param {Boolean} isApproved - Whether account was approved
 */
async function notifyApprovalStatus(userId, isApproved) {
  try {
    const content = isApproved
      ? 'Your account has been approved! You can now log in to The Academy Communication Portal.'
      : 'Your account registration has been declined.';
    
    await createNotification({
      type: NOTIFICATION_TYPES.APPROVAL_STATUS,
      userId,
      content
    });
  } catch (error) {
    console.error('Error notifying about approval status:', error);
  }
}

// Export notification functions
module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  notifyNewMessage,
  notifyAddedToConversation,
  notifyRemovedFromConversation,
  notifyConversationArchived,
  notifyNewReaction,
  notifyApprovalStatus
};
