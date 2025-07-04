# Travonest Backend System 🏕️

A full-featured cabin reservation backend API deployed on Render. Powering seamless cabin bookings with Node.js, Express, MongoDB & Mongoose.

---

## 🚀 Quick Start

* **Clone:** `git clone https://github.com/<username>/travonest.git`
* **Install:** `npm install`
* **Env Variables:** Create a `.env` file (see [Configuration](#-configuration) below for details).
* **Run:** `npm run dev` (for development) or `npm start` (for production).
* **API Base:** `https://travonest-6xyn.onrender.com/api/v1`

---

## ✨ Core Features

* **Tours (Cabins):** Full CRUD operations with advanced filtering, sorting, pagination, and geospatial queries.
* **Users & Auth:** Robust user authentication including sign-up, login, JWT-based authentication, password reset functionality, and role-based access control (User, Guide, Lead Guide, Admin).
* **Bookings:** Secure Stripe payment integration, duplicate booking protection, and administrative override capabilities.
* **Reviews & Ratings:** Users can post and manage reviews tied to their bookings, with admin moderation options.
* **Favorites:** Users can mark booked cabins as favorites.
* **Security:** Comprehensive security measures including input validation, data sanitization, rate limiting, CORS configuration, and Helmet for HTTP header security.
* **Webhooks:** Stripe webhook endpoint to confirm and process payments securely.

---

## 🛠️ Tech Stack

* **Node.js & Express:** For building a scalable, event-driven server and implementing middleware patterns.
* **MongoDB & Mongoose:** As the NoSQL database, with Mongoose for schema definition, aggregation pipelines, geospatial queries, and indexing.
* **Stripe:** For secure and efficient payment processing flows, including webhook integration.
* **JWT (JSON Web Tokens):** For stateless authentication and secure, cookie-based token management.
* **Email & Files:** Utilizing SendGrid/Mailtrap for email services and Multer for handling file uploads.
* **Env & Deployment:** `dotenv` for environment variable management and Render for seamless deployment.
* **Dev Tools:** ESLint and Prettier for code quality, and Postman for API testing and documentation.

---

## ⚙️ Configuration

Create a `.env` file in the project root with the following variables:
PORT=3000
MONGODB_URI=<your-mongo-uri>
JWT_SECRET=<secret>
JWT_EXPIRES_IN=90d
COOKIE_EXPIRES_IN=90
STRIPE_SECRET_KEY=<key>
STRIPE_WEBHOOK_SECRET=<webhook_secret>
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=<user>
EMAIL_PASS=<pass>

---

### 🏡 Tours

| Method | Endpoint                                         | Description                                    |
| :----- | :----------------------------------------------- | :--------------------------------------------- |
| `GET`  | `/api/v1/tours`                                  | List tours (supports filters, sorts)           |
| `GET`  | `/api/v1/tours/:id`                              | Retrieve tour details                          |
| `POST` | `/api/v1/tours`                                  | Create a new tour (Admin/Lead Guide only)      |
| `PATCH`| `/api/v1/tours/:id`                              | Update tour details (Admin/Lead Guide only)    |
| `DELETE`|`/api/v1/tours/:id`                              | Delete a tour (Admin/Lead Guide only)          |
| `GET`  | `/api/v1/tours/top-5-cheap`                      | Get the top 5 cheapest tours                   |
| `GET`  | `/api/v1/tours/tour-stats`                       | Get aggregated tour statistics                 |
| `GET`  | `/api/v1/tours/monthly-plan/:year`               | Get a yearly tour plan                         |
| `GET`  | `/api/v1/tours/tours-within/:dist/center/:lat,:lng/unit/:unit` | Find tours within a specified radius     |
| `GET`  | `/api/v1/tours/distances/:lat,:lng/unit/:unit`   | Calculate distances to a specific point (geospatial) |

### 👤 Users

| Method | Endpoint                                         | Description                                    |
| :----- | :----------------------------------------------- | :--------------------------------------------- |
| `POST` | `/api/v1/users/signup`                           | Register a new user                            |
| `POST` | `/api/v1/users/login`                            | Log in a user                                  |
| `POST` | `/api/v1/users/forgotPassword`                   | Request a password reset link                  |
| `PATCH`| `/api/v1/users/resetPassword/:token`             | Reset user password using a token              |
| `GET`  | `/api/v1/users/me`                               | Get current user profile (requires auth)       |
| `PATCH`| `/api/v1/users/updateMe`                         | Update current user profile                    |
| `PATCH`| `/api/v1/users/updateMyPassword`                 | Change current user's password                 |
| `DELETE`|`/api/v1/users/deleteMe`                         | Deactivate current user's account              |
| `GET`  | `/api/v1/users`                                  | Get all users (Admin only)                     |
| `PATCH`| `/api/v1/users/:id`                              | Edit user details (Admin only)                 |
| `DELETE`|`/api/v1/users/:id`                              | Delete a user (Admin only)                     |

### 📅 Bookings

| Method | Endpoint                                         | Description                                    |
| :----- | :----------------------------------------------- | :--------------------------------------------- |
| `POST` | `/api/v1/bookings`                               | Create a new booking via Stripe                |
| `GET`  | `/api/v1/bookings`                               | Get all bookings (Admin/Guide only)            |
| `GET`  | `/api/v1/bookings/:id`                           | Get details of a specific booking              |

### ⭐ Reviews

| Method | Endpoint                                         | Description                                    |
| :----- | :----------------------------------------------- | :--------------------------------------------- |
| `POST` | `/api/v1/reviews`                                | Create a new review (must have a booking)      |
| `GET`  | `/api/v1/reviews`                                | Get all reviews (Admin only)                   |
| `GET`  | `/api/v1/reviews/:id`                            | Get details of a single review                 |
| `PATCH`| `/api/v1/reviews/:id`                            | Update a review (owner only)                   |
| `DELETE`|`/api/v1/reviews/:id`                            | Delete a review (owner/Admin only)             |
| `GET`  | `/api/v1/tours/:tourId/reviews`                  | Get reviews for a specific tour                |

---

## 🤔 How To Use

1.  Log in to the frontend at [travonest-6xyn.onrender.com/](https://travonest-6xyn.onrender.com/) (or use Postman for direct API interaction).
2.  **Browse Tours:** Use `GET /api/v1/tours` to find your desired cabin.
3.  **Book a Tour:**
    * Send a `POST` request to `/api/v1/bookings` with the `tour ID` and `user token`.
    * Proceed to the Stripe Checkout page. (Use Test Card: `4242 4242 4242 4242`, Exp: `02/22`, CVV: `222`).
4.  **View Bookings:** Send a `GET` request to `/api/v1/bookings` to see your reservations.
5.  **Manage Profile:**
    * Use `PATCH /api/v1/users/updateMe` to update your name, email, or photo.
    * Use `PATCH /api/v1/users/updateMyPassword` to change your password.

---

## 🔧 API Usage

1.  Import `TravoNest.postman_collection.json` into Postman.
2.  Set the following Postman environment variables:
    * `{{URL}}`: `https://travonest-6xyn.onrender.com`
    * `{{TOKEN}}`: Your JWT access token (obtained after login).
3.  Explore the various endpoints under `/api/v1` in the Postman collection.

---

## 🌍 Deployment (Render)

1.  Push your code to your GitHub repository.
2.  Create a new Render Web Service and link it to your GitHub repository.
3.  Set the necessary environment variables in the Render Dashboard, mirroring your local `.env` file.
4.  Configure Render to deploy automatically on each push to the `main` branch.

---

## 🏗️ Built With

* Node.js, Express, MongoDB & Mongoose
* Pug templates (for server-side UI rendering)
* Stripe for secure payment processing
* JWT for authentication
* SendGrid / Mailtrap for email services
* Multer for file uploads
* Helmet, CORS, and rate limiting for enhanced security

---

## 🤝 Contributing

We welcome contributions! To contribute:

1.  Fork and clone the repository.
2.  Create a new feature branch: `git checkout -b feature/<your-feature-name>`
3.  Install dependencies and run tests: `npm install && npm test`
4.  Commit your changes and open a pull request.

---

## 📄 License

This project is licensed under the MIT License - © Nitish Modi.

Crafted with 🔥 Node.js & Express. Visit us at [https://travonest-6xyn.onrender.com/](https://travonest-6xyn.onrender.com/)!
