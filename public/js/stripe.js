/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51R3GdVFNTJAheHpo6dava9BW18nzLz3pRfUTczVH2jURvtg09fnMBXd2AVL5UdqVjgTIJE1SO0KnfwVmjSGpwKi5000JEMZAaT'
);

export const bookTour = async (tourId) => {
  try {
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', 'An error occurred while trying to book the tour.');
  }
};
