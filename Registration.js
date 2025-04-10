document.addEventListener('DOMContentLoaded', function() {
  // Find the registration link
  const registerLink = document.querySelector('a[href="#register"], #register-link');
  
  if (registerLink) {
    registerLink.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Register link clicked');
      showRegistration();
    });
  }
  
  // Create the showRegistration function
  window.showRegistration = function() {
    console.log('Showing registration form');
    // Check if registration form already exists
    if (document.getElementById('registration-form')) {
      document.getElementById('registration-form').style.display = 'block';
      document.getElementById('login-form').style.display = 'none';
      return;
    }
    
    // Hide login form
    document.getElementById('login-form').style.display = 'none';
    
    // Create registration form
    const authContainer = document.querySelector('.auth-container');
    const registrationForm = document.createElement('form');
    registrationForm.id = 'registration-form';
    registrationForm.className = 'auth-form';
    
    registrationForm.innerHTML = `
      <div class="auth-header">
        <h2>Create an Account</h2>
        <p>Join The Academy Communication Portal</p>
      </div>
      <div class="form-group">
        <label for="reg-name">Full Name</label>
        <input type="text" id="reg-name" name="name" required>
      </div>
      <div class="form-group">
        <label for="reg-email">Email Address</label>
        <input type="email" id="reg-email" name="email" required>
      </div>
      <div class="form-group">
        <label for="reg-password">Password</label>
        <input type="password" id="reg-password" name="password" required>
      </div>
      <div class="form-group">
        <label for="reg-confirm-password">Confirm Password</label>
        <input type="password" id="reg-confirm-password" name="confirmPassword" required>
      </div>
      <div class="form-group">
        <label for="reg-role">Role</label>
        <select id="reg-role" name="role" required>
          <option value="">Select your role</option>
          <option value="parent">Parent</option>
          <option value="player">Player</option>
          <option value="coach">Coach</option>
        </select>
      </div>
      <div id="registration-status" class="status-message" style="display: none;"></div>
      <div class="form-options">
        <button type="submit" class="btn-primary">Register</button>
      </div>
      <div class="auth-footer">
        <p>Already have an account? <a href="#login" id="back-to-login">Sign In</a></p>
      </div>
    `;
    
    // Add the form to the container
    authContainer.appendChild(registrationForm);
    
    // Add event listener for back to login
    document.getElementById('back-to-login').addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('registration-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
    });
    
    // Add event listener for form submission
    registrationForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('Registration form submitted');
      
      // Get form data
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;
      const role = document.getElementById('reg-role').value;
      
      // Validate passwords match
      if (password !== confirmPassword) {
        showStatus('Passwords do not match', 'error');
        return;
      }
      
      // Show loading state
      const submitButton = registrationForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Registering...';
      submitButton.disabled = true;
      
      // For development/testing - simulate successful registration
      setTimeout(function() {
        // Reset button state
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        
        // Show success message
        showStatus('Registration successful! Please log in.', 'success');
        
        // Switch back to login form after a delay
        setTimeout(function() {
          document.getElementById('registration-form').style.display = 'none';
          document.getElementById('login-form').style.display = 'block';
        }, 2000);
      }, 1500);
      
      // When ready to connect to real backend, uncomment this code:
      /*
      fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Registration failed');
        }
        return response.json();
      })
      .then(data => {
        // Reset button state
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        
        if (data.error) {
          showStatus(data.error, 'error');
        } else {
          // Show success message
          showStatus('Registration successful! Please log in.', 'success');
          
          // Switch back to login form after a delay
          setTimeout(function() {
            document.getElementById('registration-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
          }, 2000);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        
        // Reset button state
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        
        showStatus('Registration failed. Please try again later.', 'error');
      });
      */
    });
    
    // Helper function to show status messages
    function showStatus(message, type) {
      const statusElement = document.getElementById('registration-status');
      statusElement.textContent = message;
      statusElement.className = 'status-message ' + type;
      statusElement.style.display = 'block';
    }
  };
});
