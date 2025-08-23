// Vercel API Route for RTG Authentication with Supabase
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'rtg-secret-key-change-in-production';

// Helper functions
function errorResponse(res, statusCode, message, details = null) {
  const body = { error: message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}

export default async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    const { action, email, password, name } = req.body;

    if (!action) {
      return errorResponse(res, 400, 'Action is required');
    }

    switch (action) {
      case 'signup':
        return await handleSignup(res, email, password, name);
      case 'login':
        return await handleLogin(res, email, password);
      case 'verify':
        return await handleVerify(res, req.headers);
      case 'health':
        return await handleHealthCheck(res);
      default:
        return errorResponse(res, 400, 'Invalid action');
    }

  } catch (error) {
    console.error('Auth API error:', error);
    return errorResponse(res, 500, 'Authentication failed', error.message);
  }
}

async function handleSignup(res, email, password, name) {
  if (!email || !password || !name) {
    return errorResponse(res, 400, 'Email, password, and name are required');
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return errorResponse(res, 400, 'User already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in Supabase
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email: email.toLowerCase(),
          name: name,
          password_hash: hashedPassword,
          role: 'PM',
          active: true,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return successResponse(res, {
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        trial_ends_at: user.trial_ends_at
      },
      token
    }, 201);

  } catch (error) {
    console.error('Signup error:', error);
    return errorResponse(res, 500, 'Failed to create account', error.message);
  }
}

async function handleLogin(res, email, password) {
  if (!email || !password) {
    return errorResponse(res, 400, 'Email and password are required');
  }

  try {
    // Find user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, password_hash, role, active, trial_ends_at')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    if (!user.active) {
      return errorResponse(res, 401, 'Account is disabled');
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return successResponse(res, {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        trial_ends_at: user.trial_ends_at
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 500, 'Login failed', error.message);
  }
}

async function handleVerify(res, headers) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'No token provided');
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get fresh user data
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, role, active, trial_ends_at')
      .eq('id', decoded.userId)
      .single();

    if (fetchError || !user || !user.active) {
      return errorResponse(res, 401, 'Invalid token');
    }

    return successResponse(res, {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        trial_ends_at: user.trial_ends_at
      }
    });

  } catch (error) {
    return errorResponse(res, 401, 'Invalid token');
  }
}

async function handleHealthCheck(res) {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    return successResponse(res, {
      success: true,
      database: { status: 'healthy', provider: 'Supabase' },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(res, 500, 'Health check failed', error.message);
  }
}

