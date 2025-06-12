# Backend API Project

A professional Node.js backend API built with Express.js and MongoDB.

## Features

- 🚀 Express.js web framework
- 📦 MongoDB with Mongoose ODM
- 🔐 JWT Authentication
- 🛡️ Security middleware (Helmet, CORS, Rate Limiting)
- ✅ Input validation
- 📝 Request logging
- 🗂️ Modular folder structure
- 🔧 Environment configuration
- 📊 Error handling

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   - Copy `.env.example` to `.env`
   - Update the variables with your values

3. **Start MongoDB**

   - Local: Make sure MongoDB is running
   - Atlas: Update MONGODB_URI in .env

4. **Run the application**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Users

- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # Route definitions
├── app.js          # Express app setup
└── server.js       # Server entry point
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/backend_db
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
API_VERSION=v1
```
