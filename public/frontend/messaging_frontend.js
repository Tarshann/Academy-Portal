// Frontend components for messaging and notifications

import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';
import axios from 'axios';
import { formatDistance } from 'date-fns';

// Main Messaging Dashboard Component
const MessagingDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's groups
        const groupsRes = await axios.get('/api/groups');
        setGroups(groupsRes.data);
        
        // Fetch user's contacts (recent conversations)
        const contactsRes = await axios.get('/api/users/contacts');
        setContacts(contactsRes.data);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load messaging data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="messaging-dashboard">
      <div className="messaging-sidebar">
        <div className="messaging-tabs">
          <button 
            className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            Groups
          </button>
          <button 
            className={`tab-button ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => setActiveTab('direct')}
          >
            Direct Messages
          </button>
        </div>
        
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="conversation-list">
            {activeTab === 'groups' ? (
              groups.length > 0 ? (
                groups.map(group => (
                  <GroupListItem key={group._id} group={group} />
                ))
              ) : (
                <div className="empty-state">
                  <p>You don't have any groups yet.</p>
                  <button className="btn btn-primary">Create Group</button>
                </div>
              )
            ) : (
              contacts.length > 0 ? (
                contacts.map(contact => (
                  <ContactListItem key={contact._id} contact={contact} />
                ))
              ) : (
                <div className="empty-state">
                  <p>You don't have any conversations yet.</p>
                  <button className="btn btn-primary">Start Conversation</button>
                </div>
              )
            )}
          </div>
        )}
      </div>
      
      <div className="messaging-content">
        {/* This will be replaced with the active conversation */}
        <div className="select-conversation-prompt">
          <div className="prompt-icon">
            <i className="fas fa-comments"></i>
          </div>
          <h3>Select a conversation to start messaging</h3>
          <p>Choose a group or direct message from the sidebar</p>
        </div>
      </div>
    </div>
  );
};

// Group List Item Component
const GroupListItem = ({ group, isActive, onClick }) => {
  return (
    <div 
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="conversation-avatar">
        {group.groupImage ? (
          <img src={group.groupImage} alt={group.name} />
        ) : (
          <div className="avatar-placeholder">
            {group.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="conversation-info">
        <h4 className="conversation-name">{group.name}</h4>
        <p className="conversation-preview">
          {group.lastMessage ? (
            <>
              <span className="message-sender">
                {group.lastMessage.sender.firstName}:
              </span>{' '}
              {group.lastMessage.content.length > 30
                ? `${group.lastMessage.content.substring(0, 30)}...`
                : group.lastMessage.content}
            </>
          ) : (
            <span className="no-messages">No messages yet</span>
          )}
        </p>
      </div>
      <div className="conversation-meta">
        {group.lastMessage && (
          <span className="message-time">
            {formatDistance(new Date(group.lastMessage.sentAt), new Date(), {
              addSuffix: true
            })}
          </span>
        )}
        {group.unreadCount > 0 && (
          <span className="unread-badge">{group.unreadCount}</span>
        )}
      </div>
    </div>
  );
};

// Contact List Item Component
const ContactListItem = ({ contact, isActive, onClick }) => {
  return (
    <div 
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="conversation-avatar">
        {contact.profileImage ? (
          <img src={contact.profileImage} alt={`${contact.firstName} ${contact.lastName}`} />
        ) : (
          <div className="avatar-placeholder">
            {contact.firstName.charAt(0)}
          </div>
        )}
        <span className={`status-indicator ${contact.isOnline ? 'online' : 'offline'}`}></span>
      </div>
      <div className="conversation-info">
        <h4 className="conversation-name">{`${contact.firstName} ${contact.lastName}`}</h4>
        <p className="conversation-preview">
          {contact.lastMessage ? (
            contact.lastMessage.sender === contact._id ? (
              contact.lastMessage.content.length > 30
                ? `${contact.lastMessage.content.substring(0, 30)}...`
                : contact.lastMessage.content
            ) : (
              <>
                <span className="message-sender">You:</span>{' '}
                {contact.lastMessage.content.length > 25
                  ? `${contact.lastMessage.content.substring(0, 25)}...`
                  : contact.lastMessage.content}
              </>
            )
          ) : (
            <span className="no-messages">No messages yet</span>
          )}
        </p>
      </div>
      <div className="conversation-meta">
        {contact.lastMessage && (
          <span className="message-time">
            {formatDistance(new Date(contact.lastMessage.sentAt), new Date(), {
              addSuffix: true
            })}
          </span>
        )}
        {contact.unreadCount > 0 && (
          <span className="unread-badge">{contact.unreadCount}</span>
        )}
      </div>
    </div>
  );
};

// Group Chat Component
const GroupChat = ({ groupId }) => {
  const { user } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io({
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Load group and messages
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch group details
        const groupRes = await axios.get(`/api/groups/${groupId}`);
        setGroup(groupRes.data);
        
        // Fetch messages
        const messagesRes = await axios.get(`/api/groups/${groupId}/messages`);
        setMessages(messagesRes.data);
        
        setLoading(false);
        
        // Scroll to bottom
        scrollToBottom();
      } catch (err) {
        setError('Failed to load group chat');
        setLoading(false);
      }
    };
    
    fetchData();

    // Socket event listeners
    socketRef.current.on('newMessage', message => {
      if (message.group && message.group._id === groupId) {
        setMessages(prevMessages => [...prevMessages, message]);
        scrollToBottom();
        
        // Mark message as read if it's not from current user
        if (message.sender._id !== user._id) {
          socketRef.current.emit('markAsRead', { messageId: message._id });
        }
      }
    });
    
    socketRef.current.on('userTyping', data => {
      if (data.groupId === groupId && data.userId !== user._id) {
        setTypingUsers(prevUsers => {
          if (!prevUsers.includes(data.userId)) {
            return [...prevUsers, data.userId];
          }
          return prevUsers;
        });
      }
    });
    
    socketRef.current.on('userStoppedTyping', data => {
      if (data.groupId === groupId && data.userId !== user._id) {
        setTypingUsers(prevUsers => 
          prevUsers.filter(id => id !== data.userId)
        );
      }
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.off('newMessage');
        socketRef.current.off('userTyping');
        socketRef.current.off('userStoppedTyping');
      }
    };
  }, [groupId, user._id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessageChange = e => {
    setNewMessage(e.target.value);
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { groupId });
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit('stopTyping', { groupId });
    }, 3000);
  };

  const handleFileChange = e => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    if ((!newMessage.trim() && files.length === 0) || loading) return;
    
    try {
      const formData = new FormData();
      formData.append('content', newMessage);
      formData.append('groupId', groupId);
      
      // Add files if any
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Clear form
      setNewMessage('');
      setFiles([]);
      setIsTyping(false);
      socketRef.current.emit('stopTyping', { groupId });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send message
      await axios.post('/api/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // No need to update messages array as it will come through socket
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          {group.groupImage ? (
            <img src={group.groupImage} alt={group.name} className="chat-avatar" />
          ) : (
            <div className="avatar-placeholder chat-avatar">
              {group.name.charAt(0)}
            </div>
          )}
          <div>
            <h3>{group.name}</h3>
            <p>{group.members.length} members</p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="icon-button" title="Group info">
            <i className="fas fa-info-circle"></i>
          </button>
          <button className="icon-button" title="Group settings">
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">
              <i className="fas fa-comments"></i>
            </div>
            <h3>No messages yet</h3>
            <p>Be the first to send a message to this group!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageItem 
              key={message._id} 
              message={message}
              isOwnMessage={message.sender._id === user._id}
              showSender={
                index === 0 || 
                messages[index - 1].sender._id !== message.sender._id
              }
            />
          ))
        )}
        
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="typing-text">
              {typingUsers.length === 1
                ? `${group.members.find(m => m.user._id === typingUsers[0])?.user.firstName || 'Someone'} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="file-input-container">
          <label htmlFor="file-input" className="file-input-label">
            <i className="fas fa-paperclip"></i>
          </label>
          <input
            type="file"
            id="file-input"
            multiple
            onChange={handleFileChange}
            className="file-input"
          />
          {files.length > 0 && (
            <span className="file-count">{files.length}</span>
          )}
        </div>
        
        <input
          type="text"
          value={newMessage}
          onChange={handleMessageChange}
          placeholder="Type a message..."
          className="chat-input"
        />
        
        <button 
          type="submit" 
          className="send-button"
          disabled={!newMessage.trim() && files.length === 0}
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

// Direct Message Chat Component
const DirectChat = ({ contactId }) => {
  const { user } = useContext(AuthContext);
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [contactIsTyping, setContactIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io({
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Load contact and messages
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch contact details
        const contactRes = await axios.get(`/api/users/${contactId}`);
        setContact(contactRes.data);
        
        // Fetch messages
        const messagesRes = await axios.get(`/api/messages/${contactId}`);
        setMessages(messagesRes.data);
        
        setLoading(false);
        
        // Scroll to bottom
        scrollToBottom();
      } catch (err) {
        setError('Failed to load conversation');
        setLoading(false);
      }
    };
    
    fetchData();

    // Socket event listeners
    socketRef.current.on('newMessage', message => {
      if (
        (message.sender._id === contactId && message.recipient._id === user._id) ||
        (message.sender._id === user._id && message.recipient._id === contactId)
      ) {
        setMessages(prevMessages => [...prevMessages, message]);
        scrollToBottom();
        
        // Mark message as read if it's from contact
        if (message.sender._id === contactId) {
          socketRef.current.emit('markAsRead', { messageId: message._id });
        }
      }
    });
    
    socketRef.current.on('userTyping', data => {
      if (data.userId === contactId) {
        setContactIsTyping(true);
      }
    });
    
    socketRef.current.on('userStoppedTyping', data => {
      if (data.userId === contactId) {
        setContactIsTyping(false);
      }
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.off('newMessage');
        socketRef.current.off('userTyping');
        socketRef.current.off('userStoppedTyping');
      }
    };
  }, [contactId, user._id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessageChange = e => {
    setNewMessage(e.target.value);
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { recipientId: contactId });
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit('stopTyping', { recipientId: contactId });
    }, 3000);
  };

  const handleFileChange = e => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    if ((!newMessage.trim() && files.length === 0) || loading) return;
    
    try {
      const formData = new FormData();
      formData.append('content', newMessage);
      formData.append('recipientId', contactId);
      
      // Add files if any
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Clear form
      setNewMessage('');
      setFiles([]);
      setIsTyping(false);
      socketRef.current.emit('stopTyping', { recipientId: contactId });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send message
      await axios.post('/api/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // No need to update messages array as it will come through socket
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          {contact.profileImage ? (
            <img src={contact.profileImage} alt={`${contact.firstName} ${contact.lastName}`} className="chat-avatar" />
          ) : (
            <div className="avatar-placeholder chat-avatar">
              {contact.firstName.charAt(0)}
            </div>
          )}
          <div>
            <h3>{`${contact.firstName} ${contact.lastName}`}</h3>
            <p className={`status ${contact.isOnline ? 'online' : 'offline'}`}>
              {contact.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="icon-button" title="User info">
            <i className="fas fa-info-circle"></i>
          </button>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">
              <i className="fas fa-comment"></i>
            </div>
            <h3>No messages yet</h3>
            <p>Start a conversation with {contact.firstName}!</p>
          </div>
        ) : (
          messages.map(message => (
            <MessageItem 
              key={message._id} 
              message={message}
              isOwnMessage={message.sender._id === user._id}
              showSender={false}
            />
          ))
        )}
        
        {contactIsTyping && (
          <div className="typing-indicator">
            <span className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="typing-text">
              {contact.firstName} is typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="file-input-container">
          <label htmlFor="file-input" className="file-input-label">
            <i className="fas fa-paperclip"></i>
          </label>
          <input
            type="file"
            id="file-input"
            multiple
            onChange={handleFileChange}
            className="file-input"
          />
          {files.length > 0 && (
            <span className="file-count">{files.length}</span>
          )}
        </div>
        
        <input
          type="text"
          value={newMessage}
          onChange={handleMessageChange}
          placeholder="Type a message..."
          className="chat-input"
        />
        
        <button 
          type="submit" 
          className="send-button"
          disabled={!newMessage.trim() && files.length === 0}
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

// Message Item Component
const MessageItem = ({ message, isOwnMessage, showSender }) => {
  const [showTime, setShowTime] = useState(false);
  
  const toggleTime = () => {
    setShowTime(!showTime);
  };
  
  const formatTime = date => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatDate = date => {
    return new Date(date).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`message-item ${isOwnMessage ? 'own-message' : ''}`}>
      {showSender && !isOwnMessage && (
        <div className="message-sender-info">
          {message.sender.profileImage ? (
            <img 
              src={message.sender.profileImage} 
              alt={`${message.sender.firstName} ${message.sender.lastName}`} 
              className="sender-avatar"
            />
          ) : (
            <div className="avatar-placeholder sender-avatar">
              {message.sender.firstName.charAt(0)}
            </div>
          )}
          <span className="sender-name">
            {`${message.sender.firstName} ${message.sender.lastName}`}
          </span>
        </div>
      )}
      
      <div className="message-content-container">
        <div className="message-content" onClick={toggleTime}>
          <p>{message.content}</p>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="message-attachments">
              {message.attachments.map((attachment, index) => (
                <AttachmentItem key={index} attachment={attachment} />
              ))}
            </div>
          )}
          
          {showTime && (
            <div className="message-time-detail">
              <span>{formatTime(message.sentAt)}</span>
              <span>{formatDate(message.sentAt)}</span>
              {isOwnMessage && (
                <span className="read-status">
                  {message.readBy && message.readBy.length > 0 
                    ? `Read by ${message.readBy.length}`
                    : 'Delivered'}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="message-time">
          {formatTime(message.sentAt)}
        </div>
      </div>
    </div>
  );
};

// Attachment Item Component
const AttachmentItem = ({ attachment }) => {
  const getFileIcon = fileType => {
    if (fileType.startsWith('image/')) {
      return 'fas fa-image';
    } else if (fileType.startsWith('video/')) {
      return 'fas fa-video';
    } else if (fileType.startsWith('audio/')) {
      return 'fas fa-music';
    } else if (fileType.includes('pdf')) {
      return 'fas fa-file-pdf';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return 'fas fa-file-word';
    } else if (fileType.includes('excel') || fileType.includes('sheet')) {
      return 'fas fa-file-excel';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return 'fas fa-file-powerpoint';
    } else {
      return 'fas fa-file';
    }
  };
  
  const formatFileSize = size => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // For image attachments, render a preview
  if (attachment.fileType.startsWith('image/')) {
    return (
      <div className="attachment-item image-attachment">
        <img 
          src={attachment.filePath.startsWith('http') 
            ? attachment.filePath 
            : `/${attachment.filePath}`} 
          alt={attachment.fileName}
          className="attachment-image"
        />
        <div className="attachment-info">
          <span className="attachment-name">{attachment.fileName}</span>
          <span className="attachment-size">{formatFileSize(attachment.fileSize)}</span>
        </div>
      </div>
    );
  }

  // For other file types
  return (
    <div className="attachment-item file-attachment">
      <div className="file-icon">
        <i className={getFileIcon(attachment.fileType)}></i>
      </div>
      <div className="attachment-info">
        <span className="attachment-name">{attachment.fileName}</span>
        <span className="attachment-size">{formatFileSize(attachment.fileSize)}</span>
      </div>
      <a 
        href={attachment.filePath.startsWith('http') 
          ? attachment.filePath 
          : `/${attachment.filePath}`}
        download={attachment.fileName}
        className="download-button"
      >
        <i className="fas fa-download"></i>
      </a>
    </div>
  );
};

// Notification Component
const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io({
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Load notifications
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        
        // Fetch notifications
        const res = await axios.get('/api/notifications');
        setNotifications(res.data);
        
        // Get unread count
        const countRes = await axios.get('/api/notifications/unread-count');
        setUnreadCount(countRes.data.count);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load notifications');
        setLoading(false);
      }
    };
    
    fetchNotifications();

    // Socket event listener for new notifications
    socketRef.current.on('newNotification', notification => {
      setNotifications(prevNotifications => [notification, ...prevNotifications]);
      setUnreadCount(prevCount => prevCount + 1);
    });

    // Handle clicks outside notification panel
    const handleClickOutside = e => {
      if (
        notificationRef.current && 
        !notificationRef.current.contains(e.target) &&
        !e.target.classList.contains('notification-toggle')
      ) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.off('newNotification');
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const markAsRead = async notificationId => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  return (
    <div className="notification-center">
      <button 
        className="notification-toggle"
        onClick={toggleNotifications}
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      
      {showNotifications && (
        <div className="notification-panel" ref={notificationRef}>
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="empty-notifications">
                <div className="empty-icon">
                  <i className="fas fa-bell-slash"></i>
                </div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem 
                  key={notification._id}
                  notification={notification}
                  markAsRead={markAsRead}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Notification Item Component
const NotificationItem = ({ notification, markAsRead }) => {
  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    // Navigate to relevant content based on notification type
    if (notification.type === 'message' && notification.group) {
      // Navigate to group chat
      window.location.href = `/messages/group/${notification.group._id}`;
    } else if (notification.type === 'message' && notification.sender) {
      // Navigate to direct message
      window.location.href = `/messages/direct/${notification.sender._id}`;
    } else if (notification.type === 'group_invite' && notification.group) {
      // Navigate to group
      window.location.href = `/groups/${notification.group._id}`;
    }
  };
  
  const getNotificationIcon = type => {
    switch (type) {
      case 'message':
        return 'fas fa-comment';
      case 'group_invite':
        return 'fas fa-users';
      case 'mention':
        return 'fas fa-at';
      case 'announcement':
        return 'fas fa-bullhorn';
      case 'file':
        return 'fas fa-file';
      default:
        return 'fas fa-bell';
    }
  };
  
  const formatTime = date => {
    return formatDistance(new Date(date), new Date(), {
      addSuffix: true
    });
  };

  return (
    <div 
      className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
      onClick={handleClick}
    >
      <div className="notification-icon">
        <i className={getNotificationIcon(notification.type)}></i>
      </div>
      
      <div className="notification-content">
        <p className="notification-text">{notification.content}</p>
        <span className="notification-time">{formatTime(notification.createdAt)}</span>
      </div>
      
      {!notification.isRead && (
        <div className="unread-indicator"></div>
      )}
    </div>
  );
};

export {
  MessagingDashboard,
  GroupChat,
  DirectChat,
  NotificationCenter
};
