# LeetTrack Backend

Backend server for the LeetTrack application, a platform for tracking LeetCode progress and managing study plans.

## Features

- User authentication and authorization
- User profile management
- LeetCode question management
- Admin functionality for managing questions
- JWT-based authentication
- MongoDB database integration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd leet-track-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3030
MONGODB_URI=mongodb://localhost:27017/leet-track
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Users
- GET `/api/users/profile` - Get user profile
- PUT `/api/users/profile` - Update user profile
- PUT `/api/users/change-password` - Change password
- GET `/api/users/all` - Get all users (admin only)

### Questions
- GET `/api/questions` - Get all questions
- GET `/api/questions/:id` - Get question by ID
- POST `/api/questions` - Create new question (admin only)
- PUT `/api/questions/:id` - Update question (admin only)
- DELETE `/api/questions/:id` - Delete question (admin only)

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## Security

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Admin routes are protected
- CORS is enabled for frontend access

## Development

To start the development server with hot reloading:
```bash
npm run dev
```

To start the production server:
```bash
npm start
``` 