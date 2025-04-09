// Integration of Communication Portal with Existing Website

// Main integration file that connects the portal with the website
// This will be included in the main website layout

// Import required components
import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import { AuthProvider, AuthContext } from './auth_context';
import { MessagingDashboard, GroupChat, DirectChat, NotificationCenter } from './messaging_components';
import PrivateRoute from './PrivateRoute';

// Main Portal Integration Component
const CommunicationPortalIntegration = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="academy-app">
          <Header />
          <main className="main-content">
            <Switch>
              <Route exact path="/" component={HomePage} />
              <Route path="/about" component={AboutPage} />
              <Route path="/programs" component={ProgramsPage} />
              <Route path="/operations" component={OperationsPage} />
              <Route path="/future" component={FuturePage} />
              <Route path="/contact" component={ContactPage} />
              <PrivateRoute path="/messages" component={MessagingPage} />
              <PrivateRoute path="/profile" component={ProfilePage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/forgot-password" component={ForgotPasswordPage} />
              <Route path="/reset-password/:token" component={ResetPasswordPage} />
            </Switch>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

// Header Component with Navigation and Notification Center
const Header = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <header className="site-header">
      <div className="header-container">
        <div className="logo-container">
          <Link to="/" className="logo-link">
            <img src="/images/academy_logo.jpeg" alt="The Academy" className="logo" />
          </Link>
        </div>
        
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
        
        <nav className={`main-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/" className="nav-link">Home</Link>
            </li>
            <li className="nav-item">
              <Link to="/about" className="nav-link">About</Link>
            </li>
            <li className="nav-item">
              <Link to="/programs" className="nav-link">Programs</Link>
            </li>
            <li className="nav-item">
              <Link to="/operations" className="nav-link">Operations</Link>
            </li>
            <li className="nav-item">
              <Link to="/future" className="nav-link">Future</Link>
            </li>
            <li className="nav-item">
              <Link to="/contact" className="nav-link">Contact</Link>
            </li>
            {isAuthenticated && (
              <li className="nav-item">
                <Link to="/messages" className="nav-link">Messages</Link>
              </li>
            )}
          </ul>
        </nav>
        
        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <NotificationCenter />
              <div className="user-menu">
                <div className="user-avatar">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user.firstName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {user?.firstName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="user-dropdown">
                  <Link to="/profile" className="dropdown-item">Profile</Link>
                  <button onClick={logout} className="dropdown-item">Logout</button>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-logo">
          <img src="/images/academy_logo.jpeg" alt="The Academy" className="logo" />
        </div>
        
        <div className="footer-links">
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/programs">Programs</Link></li>
              <li><Link to="/operations">Operations</Link></li>
              <li><Link to="/future">Future</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Connect With Us</h3>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social-link" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-link" aria-label="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Contact Information</h3>
            <p>Locations: Sumner Academy and Unlimited Potential gyms, Gallatin, TN</p>
            <p>Website: <a href="https://academytn.com" target="_blank" rel="noopener noreferrer">academytn.com</a></p>
            <p>Communication: GroupMe app</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} The Academy Basketball. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Messaging Page Component
const MessagingPage = () => {
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversationType, setConversationType] = useState(null);
  
  const handleSelectGroup = (groupId) => {
    setActiveConversation(groupId);
    setConversationType('group');
  };
  
  const handleSelectContact = (contactId) => {
    setActiveConversation(contactId);
    setConversationType('direct');
  };
  
  return (
    <div className="page-container messaging-page">
      <h1 className="page-title">Messages</h1>
      
      <div className="messaging-container">
        {!activeConversation ? (
          <MessagingDashboard 
            onSelectGroup={handleSelectGroup}
            onSelectContact={handleSelectContact}
          />
        ) : conversationType === 'group' ? (
          <GroupChat 
            groupId={activeConversation}
            onBack={() => setActiveConversation(null)}
          />
        ) : (
          <DirectChat 
            contactId={activeConversation}
            onBack={() => setActiveConversation(null)}
          />
        )}
      </div>
    </div>
  );
};

// Profile Page Component
const ProfilePage = () => {
  const { user, loading } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    notificationPreferences: {
      email: true,
      push: true,
      inApp: true
    }
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        notificationPreferences: user.notificationPreferences || {
          email: true,
          push: true,
          inApp: true
        }
      });
    }
  }, [user]);
  
  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleNotificationChange = e => {
    setFormData({
      ...formData,
      notificationPreferences: {
        ...formData.notificationPreferences,
        [e.target.name]: e.target.checked
      }
    });
  };
  
  const handleSubmit = async e => {
    e.preventDefault();
    
    try {
      // Update profile API call would go here
      setMessage('Profile updated successfully');
      setError('');
    } catch (err) {
      setError('Failed to update profile');
      setMessage('');
    }
  };
  
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  
  return (
    <div className="page-container profile-page">
      <h1 className="page-title">Your Profile</h1>
      
      <div className="profile-container">
        <div className="profile-header">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.firstName} className="profile-image" />
          ) : (
            <div className="avatar-placeholder profile-image">
              {user?.firstName?.charAt(0)}
            </div>
          )}
          
          <div className="profile-info">
            <h2>{`${user?.firstName} ${user?.lastName}`}</h2>
            <p>{user?.email}</p>
            <p>Role: {user?.role}</p>
          </div>
        </div>
        
        <div className="profile-tabs">
          <div className="profile-tab active">Profile Settings</div>
          <div className="profile-tab">Account Security</div>
          <div className="profile-tab">Notification Settings</div>
        </div>
        
        <div className="profile-content">
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled
              />
              <small>Email cannot be changed</small>
            </div>
            
            <div className="notification-settings">
              <h3>Notification Preferences</h3>
              
              <div className="notification-option">
                <input
                  type="checkbox"
                  id="email-notifications"
                  name="email"
                  checked={formData.notificationPreferences.email}
                  onChange={handleNotificationChange}
                />
                <label htmlFor="email-notifications">Email Notifications</label>
              </div>
              
              <div className="notification-option">
                <input
                  type="checkbox"
                  id="push-notifications"
                  name="push"
                  checked={formData.notificationPreferences.push}
                  onChange={handleNotificationChange}
                />
                <label htmlFor="push-notifications">Push Notifications</label>
              </div>
              
              <div className="notification-option">
                <input
                  type="checkbox"
                  id="inapp-notifications"
                  name="inApp"
                  checked={formData.notificationPreferences.inApp}
                  onChange={handleNotificationChange}
                />
                <label htmlFor="inapp-notifications">In-App Notifications</label>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommunicationPortalIntegration;
