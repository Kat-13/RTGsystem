// Vercel API Route for RTG User Management with Supabase
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  try {
    const { method, query, body } = req;
    const userId = query.id;
    
    switch (method) {
      case 'GET':
        return await handleGetUsers(res, userId);
      case 'POST':
        return await handleCreateUser(res, body);
      case 'PUT':
        return await handleUpdateUser(res, userId, body);
      case 'DELETE':
        return await handleDeleteUser(res, userId);
      default:
        return errorResponse(res, 405, 'Method not allowed');
    }

  } catch (error) {
    console.error('Users API error:', error);
    return errorResponse(res, 500, 'Operation failed', error.message);
  }
}

async function handleGetUsers(res, userId) {
  try {
    if (userId) {
      // Get specific user by ID
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, role, active, created_at, trial_ends_at, last_login')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        return errorResponse(res, 404, 'User not found');
      }
      
      return successResponse(res, user);
    } else {
      // Get all users
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, role, active, created_at, trial_ends_at, last_login')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return successResponse(res, users);
    }
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(res, 500, 'Failed to retrieve users', error.message);
  }
}

async function handleCreateUser(res, body) {
  try {
    const { name, email, role } = body;
    
    if (!name || !email) {
      return errorResponse(res, 400, 'Name and email are required');
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return errorResponse(res, 400, 'User with this email already exists');
    }

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        {
          name: name,
          email: email.toLowerCase(),
          role: role || 'Team Member',
          active: true
        }
      ])
      .select('id, name, email, role, active, created_at')
      .single();

    if (error) {
      throw error;
    }

    return successResponse(res, user, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse(res, 500, 'Failed to create user', error.message);
  }
}

async function handleUpdateUser(res, userId, body) {
  try {
    if (!userId) {
      return errorResponse(res, 400, 'User ID is required');
    }

    const { name, email, role, active } = body;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return errorResponse(res, 404, 'User not found');
    }

    // Build update object
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1) { // Only updated_at
      return errorResponse(res, 400, 'No valid fields to update');
    }

    // Update user
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, role, active, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    return successResponse(res, user);
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse(res, 500, 'Failed to update user', error.message);
  }
}

async function handleDeleteUser(res, userId) {
  try {
    if (!userId) {
      return errorResponse(res, 400, 'User ID is required');
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return errorResponse(res, 404, 'User not found');
    }

    // Soft delete by setting active to false
    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return successResponse(res, { 
      success: true, 
      message: 'User deactivated successfully',
      id: user.id 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 500, 'Failed to delete user', error.message);
  }
}

