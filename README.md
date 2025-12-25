# Multi-Factor Authentication (MFA) in Express.js

A secure, production-ready authentication system built with Node.js/Express featuring two-factor authentication (2FA), email verification, password reset, and JWT-based token management.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Security Features](#security-features)
- [Error Handling](#error-handling)

---

## Features

**User Registration** - Email-based user registration with validation
**Email Verification** - Users must verify their email before login
**Two-Factor Authentication (2FA)** - QR code-based TOTP (Time-based One-Time Password)
**JWT Authentication** - Access tokens (7m) and refresh tokens (7d)
**Password Reset** - Secure password reset via email token
**Session Management** - Refresh token storage with device tracking
**Rate Limiting** - Global rate limiting and brute-force protection on login
**Data Sanitization** - MongoDB injection prevention
**Secure Cookies** - HttpOnly cookie management
**Error Handling** - Comprehensive error responses

---

## Tech Stack

- **Backend**: Node.js, Express.js 5.x
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js (Local, JWT, Custom temp JWT)
- **Security**: bcrypt, jsonwebtoken, crypto
- **Email**: Nodemailer (Gmail SMTP)
- **2FA**: speakeasy (TOTP), qrcode
- **Validation**: Zod schema validation
- **Rate Limiting**: Express rate-limit middleware
- **Environment**: dotenv

---

## Project Structure

```
Multi Factor Authentication/
├── config/
│   ├── dbConnection.js          # MongoDB connection setup
│   └── passportConfig.js        # Passport.js strategies (Local, JWT, Temp JWT)
├── controller/
│   └── authController.js        # Authentication logic (register, login, 2FA, password reset)
├── middleware/
│   ├── ratelimiter.js          #  rate limiter
│      
├── models/
│   ├── user.js                 # User schema with MFA fields
│   └── token.js                # RefreshToken schema for session tracking

├── route/
│   └── Authroutes.js           # All auth endpoint definitions
├── utils/
│   ├── sendEmail.js            # Email sending (verification, password reset)
│   └── token.js                # JWT token generation (access, refresh, temporary)
├── validators/
│   └── registerValidation.js   # Zod schema for registration validation
├── .env                        # Environment variables (NOT in repo)
├── server.js                   # Express app setup and startup
└── package.json                # Dependencies and scripts
```

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Iamahmedforreal/Multi-Factor-Authentication-in-express.js.git
cd "Multi Factor Authentication"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env` File

Create a `.env` file in the root directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/mfa-auth

# Server
PORT=7000

# JWT Secrets (use strong random strings)
JWT_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_TEMPOROY=your_temporary_token_secret_here

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Note: For Gmail, use an App Password instead of your main password
# See: https://support.google.com/accounts/answer/185833
```

### 4. Start the Server

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

The server will run on `http://localhost:7000` by default.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb_url` |
| `PORT` | Server port | `your port` |
| `JWT_SECRET` | Access token secret | `your_secret_key_123` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your_refresh_secret_456` |
| `JWT_TEMPORARY_SECRET` | Temporary token secret (for 2FA) | `your_temp_secret_789` |
| `EMAIL_USER` | Sender email address | `myapp@gmail.com` |

| `EMAIL_PASS` | Email app password | `abcd efgh ijkl mnop` |

### Rate limiting

The project implements per-route rate limiting backed by a MongoDB "bucket" collection. Middleware lives in `middleware/ratelimiter.js` and uses an atomic `findOneAndUpdate` pattern to avoid race conditions when multiple requests arrive concurrently.

- `loginRatelimit` — applied to `POST /login` (limits by IP + email).
- `forgetpasswordratelimit` — applied to `POST /forgot-password` (limits password reset requests by IP + email).
- `resetPasswordConfirmRatelimit` — applied to `POST /reset-password` (limits reset confirmations by IP + email).
- `refreshratelimit` — applied to `GET /refresh` (limits refresh token usage).
- `mfaVerifyRatelimit` — applied to MFA verification endpoints (`/2fa/login/verify`, `/2fa/setup/verify`) and uses userId + IP as the key.

Each limiter returns HTTP `429` with `retryAfterMinutes` when the limit is exceeded. You can configure the limit window and count in `middleware/ratelimiter.js` via `MAX_ATTEMP` and `MAX_WINDOW`.

---

## API Endpoints

### Authentication Endpoints

All endpoints are prefixed with `/api/auth`

#### 1. Register User

**POST** `/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "message": "User created successfully please verify your email"
}
```

**Validation:**
- Email must be valid and unique
- Password must meet requirements (enforced by Zod schema)

---

#### 2. Verify Email

**GET** `/verify-email?token={token}`

Verify user email with token sent to inbox.

**Success Response (200):**
```
Email verified successfully
```

**Error (400):**
```
Invalid or expired token
```

---

#### 3. Login

**POST** `/login`

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200) - Without 2FA:**
```json
{
  "message": "user logged in",
  "AccessToken": "eyJhbGc..."
}
```

**Response (200) - With 2FA Active:**
```json
{
  "message": "verify your user",
  "temp": "eyJhbGc..."
}
```

**Notes:**
- Email must be verified first
- If 2FA is enabled, user receives a temporary token (10m validity)
- Uses `loginLimiter` middleware for brute-force protection

---

#### 4. Setup 2FA (Multi-Factor Authentication)

**POST** `/2fa/setup`

Generate QR code and secret for TOTP setup.

**Headers:**
```
Authorization: Bearer {tempToken}
```

**Success Response (200):**
```json
{
  "secret": "JBSWY3DPEBLW64TMMQQ",
  "qrimage": "data:image/png;base64,iVBORw0KG..."
}
```

**Usage:**
1. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
2. User receives 6-digit codes automatically

---

#### 5. Verify 2FA Code

**POST** `/2fa/verify`

Submit TOTP code to complete login.

**Headers:**
```
Authorization: Bearer {tempToken}
```

**Request Body:**
```json
{
  "token": "123456"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGc..."
}
```

**Error (403):**
```json
{
  "message": "code not correct"
}
```

---

#### 6. Reset 2FA

**POST** `/2fa/reset`

Disable 2FA for the user.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (202):**
```
MFA reset successfully
```

---

#### 7. User Status

**GET** `/status`

Fetch current user information.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```json
{
  "username": "user@example.com",
  "IsMfaActive": true
}
```

---

#### 8. Refresh Token

**GET** `/refresh`

Get a new access token using the refresh token from cookies.

**Cookies Required:**
```
refreshtoken={token}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGc..."
}
```

---

#### 9. Forgot Password

**POST** `/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "password reset email sent"
}
```

---

#### 10. Reset Password

**POST** `/reset-password?token={token}`

Complete password reset with provided token and new password.

**Request Body:**
```json
{
  "password": "NewSecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "message": "password reset successfully"
}
```

---

#### 11. Logout

**POST** `/logout`

Revoke refresh token and clear session.

**Cookies Required:**
```
refreshtoken={token}
```

**Success Response (204):**
No content

---

## Authentication Flow

### Standard Login Flow (Without 2FA)

```
1. User registers with email/password
   ↓
2. Email verification email is sent
   ↓
3. User clicks verification link
   ↓
4. POST /login with email/password
   ↓
5. Server returns access token + refresh token
   ↓
6. User can access protected routes with access token
```

### Login Flow with 2FA Enabled

```
1. POST /login with email/password
   ↓
2. Server validates credentials
   ↓
3. Server detects 2FA is enabled
   ↓
4. Server returns temporary token (10m validity)
   ↓
5. POST /2fa/verify with 6-digit code
   ↓
6. Server validates TOTP code
   ↓
7. Server returns access token + refresh token
   ↓
8. User can access protected routes
```

### Token Lifetimes

| Token Type | Validity | Use Case |
|-----------|----------|----------|
| Access Token | 7 minutes | Protected API routes |
| Refresh Token | 7 days | Get new access token |
| Temporary Token | 10 minutes | 2FA verification only |
| Email Token | 1 hour | Email verification |
| Password Reset Token | 15 minutes | Password reset |

---

## Security Features

###  Encryption & Hashing
- **bcrypt** for password hashing (salt rounds: 10)
- **crypto** for secure token generation
- **JWT** for stateless authentication

###  Injection Prevention
- MongoDB sanitization middleware (`express-mongo-sanitize`)
- Zod schema validation for input data

###  Rate Limiting
- Global rate limiter on all routes
- Dedicated brute-force limiter on `/login` endpoint

###  Cookie Security
- Refresh tokens stored in secure cookies
- HttpOnly flag can be enabled for production

###  Email Verification
- Users must verify email before login
- Tokens expire after 1 hour

###  Token Rotation
- Access tokens expire after 7 minutes
- Refresh tokens enable long-lived sessions (7 days)
- Refresh tokens tracked in database with device/IP info

### 2FA (TOTP)
- Time-based One-Time Password using speakeasy
- QR code for easy authenticator app setup
- 6-digit codes required for login verification

---

## Error Handling

Common error responses:

| Status | Message | Cause |
|--------|---------|-------|
| 400 | `Invalid or expired token` | Email/password reset token expired |
| 400 | `user does not exist` | Email not found in forgot-password |
| 401 | Unauthorized | Missing or invalid access token |
| 403 | `code not correct` | Invalid TOTP code |
| 404 | `User not found` | User doesn't exist during login |
| 500 | `Server error` | Unexpected error (check logs) |

---

## Database Models

### User Schema

```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  IsMfaActive: Boolean,
  TwoFactorSecret: String (TOTP secret),
  isemailVerified: Boolean,
  resetPasswordToken: String,
  resetPasswordTokenExpires: Date,
  emailVerificationToken: String,
  emailVerificationTokenExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### RefreshToken Schema

```javascript
{
  userId: ObjectId (ref: User),
  token: String (unique, required),
  expiresAt: Date,
  device: String (User-Agent),
  ip_address: String,
  createdAt: Date (auto)
}
```

---

## Troubleshooting

### "Cannot set property query of #<IncomingMessage>"
- Fixed in `server.js` with custom sanitizer that mutates objects in-place
- This is a compatibility issue between `express-mongo-sanitize` and certain Node/Express versions

### "User not found" on login
- Ensure user is registered first: POST `/register`
- Verify email was confirmed: Check email for verification link

### "Invalid TOTP code"
- Ensure device time is synchronized (TOTP is time-based)
- Try a different 6-digit code from authenticator app

### Emails not sending
- Check `EMAIL_USER` and `EMAIL_PASS` in `.env`
- For Gmail, use an App Password: https://support.google.com/accounts/answer/185833
- Ensure "Less secure apps" is allowed (if not using App Password)

### Rate limit exceeded
- Wait 15 minutes before retrying
- Configure rate limiter in `middleware/ratelimiter.js`

---

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- All endpoints are documented
- Security best practices are maintained

---

## License

ISC

---

## Author

**Ahmed** - [GitHub](https://github.com/Iamahmedforreal)

---

## Support

For issues and questions, please open a GitHub issue or contact the author.
