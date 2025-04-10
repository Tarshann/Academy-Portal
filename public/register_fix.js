document.addEventListener('DOMContentLoaded', function() {
  const registerLink = document.querySelector('a[href="#register"], a:contains("Register Now")');
  
  if (registerLink) {
    registerLink.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Register link clicked');
      
      // Show registration form or redirect to registration page
      window.location.href = '/register.html';
      // Or if you're using a modal:
      // document.getElementById('registration-modal').classList.add('active');
    });
  } else {
    console.error('Register link not found');
  }
});
