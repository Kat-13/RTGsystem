# RTG System - Vercel + Supabase

Clean, working version of the RTG Project Management System using Vercel for deployment and Supabase for the database.

## 🚀 Quick Setup

### 1. Database Setup (Supabase)

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)
2. **Run the schema script**:
   - Go to your Supabase dashboard → SQL Editor
   - Copy and paste the contents of `supabase-schema.sql`
   - Run the script to create all tables and policies
3. **Get your credentials**:
   - Project URL: `https://your-project.supabase.co`
   - Anon Key: Found in Settings → API

### 2. Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Clean Vercel + Supabase setup"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect the configuration

3. **Set Environment Variables** in Vercel dashboard:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   JWT_SECRET=your-super-secret-jwt-key-2024
   ```

4. **Deploy** - Vercel will automatically deploy your functions

### 3. Test Your Deployment

Your API endpoints will be available at:
- `https://your-app.vercel.app/api/auth` (POST with action: signup/login/verify/health)
- `https://your-app.vercel.app/api/users` (GET/POST/PUT/DELETE)
- `https://your-app.vercel.app/api/projects` (GET/POST/PUT/DELETE)

## 📁 Project Structure

```
rtg-system/
├── api/                    # Vercel serverless functions
│   ├── auth.js            # Authentication endpoints
│   ├── users.js           # User management
│   └── projects.js        # Project management
├── assets/                # Frontend assets
├── index.html             # Main frontend
├── package.json           # Dependencies
├── vercel.json           # Vercel configuration
├── supabase-schema.sql   # Database schema
└── .env.example          # Environment variables template
```

## 🔧 Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Run locally**:
   ```bash
   npm run dev
   ```

## 🎯 Key Features

- ✅ **Working Functions**: Vercel properly handles serverless functions
- ✅ **Reliable Database**: Supabase handles connections and scaling
- ✅ **No More 404s**: Proper routing and function detection
- ✅ **Clean Code**: No Netlify-specific junk or connection pool nightmares
- ✅ **Modern Stack**: ES6 modules, proper error handling, CORS support

## 🔄 Migration from Netlify

This replaces your Netlify setup with:
- **Vercel** instead of Netlify (better function handling)
- **Supabase** instead of Neon + pg (managed connections)
- **api/** folder instead of netlify-functions/
- **ES6 modules** instead of CommonJS
- **Built-in CORS** instead of manual headers

## 🛠 API Usage

### Authentication
```javascript
// Signup
POST /api/auth
{
  "action": "signup",
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

// Login
POST /api/auth
{
  "action": "login",
  "email": "user@example.com",
  "password": "password123"
}

// Verify token
POST /api/auth
{
  "action": "verify"
}
// Headers: Authorization: Bearer <token>
```

### Users
```javascript
// Get all users
GET /api/users

// Get specific user
GET /api/users?id=user-uuid

// Create user
POST /api/users
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "Team Member"
}
```

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- JWT token authentication
- CORS properly configured
- Environment variables for sensitive data
- Supabase handles SQL injection protection

## 📞 Support

If you encounter any issues:
1. Check Vercel function logs in the dashboard
2. Verify Supabase connection in the SQL Editor
3. Test API endpoints with the health check: `/api/auth` with `{"action": "health"}`

This setup should work reliably without the connection issues you experienced with Netlify!

