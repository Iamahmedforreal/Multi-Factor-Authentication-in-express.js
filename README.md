# Multi-Factor Authentication (MFA) API

A secure, production-ready authentication system built with Node.js/Express featuring two-factor authentication (2FA), email verification, password reset, and JWT-based token management.

---

## 🚀 Production Readiness Checklist

To make this application ready for a production environment, complete the following items:

- [ ] **Infrastructure**
    - [ ] **Use Redis for Rate Limiting & Refresh Tokens**: Currently, rate limits are stored in memory or MongoDB, and refresh tokens are in MongoDB. For high-scale production, migrate these to **Redis** for faster access times and better expiration handling.
    - [ ] **Set up a Reverse Proxy**: Use Nginx or Caddy in front of the Node.js app to handle SSL termination, load balancing, and static files.
    - [ ] **Enable Cluster Mode**: Use PM2 or Node's `cluster` module to utilize all CPU cores.

- [ ] **Security**
    - [ ] **Set `secure: true` for Cookies**: Ensure cookies are only sent over HTTPS (requires SSL).
    - [ ] **Rotate Secrets**: Use a secrets manager (like AWS Secrets Manager or HashiCorp Vault) instead of `.env` files for production keys.
    - [ ] **CSP Headers**: Implement strong Content Security Policy (CSP) headers using `helmet`.

- [ ] **Monitoring & Logging**
    - [ ] **Centralized Logging**: Ship logs to ELK Stack, Datadog, or CloudWatch instead of `console.log`.
    - [ ] **Performance Monitoring**: Add APM (e.g., New Relic) to track API latency and database queries.
    - [ ] **Alerting**: Set up alerts for high error rates or unusual traffic spikes.

---

## Features

- **User Registration**: Email-based signup with robust validation.
- **Email Verification**: Token-based email confirmation.
- **2FA (TOTP)**: Secure login using Google Authenticator / Authy.
- **JWT Authentication**: Short-lived Access Tokens (7m) + Long-lived Refresh Tokens (7d).
- **Session Management**: Detects new devices and tracks active sessions.
- **Security**: Rate limiting, Brute-force protection, Sanitization.

---

## Tech Stack

- **Runtime**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Caching/Store**: *Recommended: Redis* (Currently: MongoDB/In-Memory)
- **Security**: bcrypt, jsonwebtoken (JWT), speakeasy (2FA)
- **Email**: Nodemailer

---

## Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/Iamahmedforreal/Multi-Factor-Authentication-in-express.js.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   PORT=7000
   MONGO_URI=mongodb://localhost:27017/auth_db
   
   # JWT Secrets (Generate random 32+ char strings)
   JWT_SECRET=your_super_secret_access_key
   JWT_REFRESH_SECRET=your_super_secret_refresh_key
   JWT_TEMPOROY=your_temp_token_secret

   # Email Settings
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-specific-password
   ```

4. **Start the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

---

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login (returns Access & Refresh Token) | No |
| `POST` | `/api/auth/logout` | Logout (Clears cookies & DB session) | Yes |
| `GET` | `/api/auth/refresh` | Get new Access Token using Cookie | No |
| `GET` | `/api/auth/status` | Get current user status | Yes |

### Multi-Factor Authentication (2FA)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/2fa/setup` | Generate QR Code for setup | Yes (Temp Token) |
| `POST` | `/api/auth/2fa/verify` | Verify TOTP code to enable 2FA | Yes (Temp Token) |
| `POST` | `/api/auth/2fa/login` | Verify TOTP during login | Yes (Temp Token) |

### Password Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/forgot-password` | Request password reset email |
| `POST` | `/api/auth/reset-password` | Set new password using token |

---

## Project Structure

```
├── config/             # DB and Passport configuration
├── controller/         # Request handlers (Logic)
├── middleware/         # Rate limit, Auth checks
├── models/             # Mongoose Schemas (User, Token)
├── route/              # API Route definitions
├── utils/              # Helpers (Email, Token generation)
└── validators/         # Zod schemas for input validation
```
