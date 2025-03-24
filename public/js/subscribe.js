/* eslint-disable */
import { showAlert } from './alerts';

export const subscribe = async (email) => {
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (data.status === 'success') {
      showAlert('success', 'Thank you for subscribing to our newsletter!');
      return true;
    } else {
      showAlert('error', data.message);
      return false;
    }
  } catch (err) {
    showAlert('error', 'Error subscribing to newsletter. Please try again.');
    return false;
  }
};

// Initialize subscription form if it exists
document.addEventListener('DOMContentLoaded', () => {
  const subscribeForm = document.getElementById('subscribeForm');

  if (subscribeForm) {
    subscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = subscribeForm.querySelector('input[type="email"]');
      const submitBtn = subscribeForm.querySelector('button[type="submit"]');

      if (!emailInput || !submitBtn) return;

      const email = emailInput.value;

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAlert('error', 'Please enter a valid email address');
        return;
      }

      // Disable button and show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Subscribing...';

      const success = await subscribe(email);

      // Reset form if successful
      if (success) {
        emailInput.value = '';
      }

      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = 'Subscribe';
    });
  }
});
