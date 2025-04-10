// Frontend components for user authentication

// React component for user registration
import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'player'
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  
  const { username, email, password, confirmPassword, firstName, lastName, role } = formData;
  
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const onSubmit = async e => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const body = JSON.stringify({ username, email, password, firstName, lastName, role });
      
      const res = await axios.post('/api/users/register', body, config);
      
      // Store token in localStorage
      localStorage.setItem('token', res.data.token);
      
      // Redirect to dashboard
      history.push('/dashboard');
      
    } catch (err) {
      setError(err.response.data.msg || 'Registration failed');
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <h2>Create an Account</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={username}
            onChange={onChange}
            required
            minLength="3"
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            required
            minLength="6"
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            required
            minLength="6"
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">I am a:</label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={onChange}
          >
            <option value="player">Player</option>
            <option value="parent">Parent</option>
            <option value="coach">Coach</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      <p className="auth-redirect">
        Already have an account? <a href="/login">Sign In</a>
      </p>
    </div>
  );
};

// React component for user login
const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  
  const { email, password } = formData;
  
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const onSubmit = async e => {
    e.preventDefault();
    
    setLoading(true);
    setError('');
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const body = JSON.stringify({ email, password });
      
      const res = await axios.post('/api/users/login', body, config);
      
      // Store token in localStorage
      localStorage.setItem('token', res.data.token);
      
      // Redirect to dashboard
      history.push('/dashboard');
      
    } catch (err) {
      setError(err.response.data.msg || 'Login failed');
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <h2>Sign In to Your Account</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-options">
          <div className="remember-me">
            <input type="checkbox" id="remember" />
            <label htmlFor="remember">Remember me</label>
          </div>
          <a href="/forgot-password" className="forgot-password">
            Forgot Password?
          </a>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      <p className="auth-redirect">
        Don't have an account? <a href="/register">Sign Up</a>
      </p>
    </div>
  );
};

// React component for password reset request
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const onChange = e => {
    setEmail(e.target.value);
  };
  
  const onSubmit = async e => {
    e.preventDefault();
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const body = JSON.stringify({ email });
      
      await axios.post('/api/users/forgot-password', body, config);
      
      setMessage('Password reset instructions sent to your email');
      setLoading(false);
      
    } catch (err) {
      setError(err.response.data.msg || 'Failed to send reset email');
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <h2>Reset Your Password</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <p>Enter your email address and we'll send you instructions to reset your password.</p>
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      <p className="auth-redirect">
        <a href="/login">Back to Sign In</a>
      </p>
    </div>
  );
};

// React component for setting new password
const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  const { token } = useParams();
  
  const { password, confirmPassword } = formData;
  
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const onSubmit = async e => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const body = JSON.stringify({ password });
      
      await axios.post(`/api/users/reset-password/${token}`, body, config);
      
      setMessage('Password has been reset successfully');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        history.push('/login');
      }, 3000);
      
    } catch (err) {
      setError(err.response.data.msg || 'Failed to reset password');
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <h2>Set New Password</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            required
            minLength="6"
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            required
            minLength="6"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

// Authentication context for React
import React, { createContext, useReducer, useEffect } from 'react';
import axios from 'axios';

// Create context
export const AuthContext = createContext();

// Initial state
const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  user: null,
  loading: true,
  error: null
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false
      };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on initial render
  useEffect(() => {
    const loadUser = async () => {
      // Check if token exists in localStorage
      if (localStorage.token) {
        // Set auth token in headers
        setAuthToken(localStorage.token);
      }

      try {
        const res = await axios.get('/api/users/me');
        dispatch({
          type: 'USER_LOADED',
          payload: res.data
        });
      } catch (err) {
        dispatch({
          type: 'AUTH_ERROR',
          payload: err.response?.data?.msg || 'Authentication error'
        });
      }
    };

    loadUser();
  }, []);

  // Set auth token in headers
  const setAuthToken = token => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
    }
  };

  // Register user
  const register = async formData => {
    try {
      const res = await axios.post('/api/users/register', formData);
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: res.data
      });
      loadUser();
    } catch (err) {
      dispatch({
        type: 'REGISTER_FAIL',
        payload: err.response?.data?.msg || 'Registration failed'
      });
    }
  };

  // Login user
  const login = async formData => {
    try {
      const res = await axios.post('/api/users/login', formData);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data
      });
      loadUser();
    } catch (err) {
      dispatch({
        type: 'LOGIN_FAIL',
        payload: err.response?.data?.msg || 'Login failed'
      });
    }
  };

  // Logout user
  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  // Clear errors
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        loading: state.loading,
        error: state.error,
        register,
        login,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Private route component for protected pages
import React, { useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  return (
    <Route
      {...rest}
      render={props =>
        loading ? (
          <div className="loader">Loading...</div>
        ) : isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

export default PrivateRoute;
