// Vercel API Route for RTG Project Management with Supabase
const { createClient } = require('@supabase/supabase-js');

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

module.exports = async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, query, body } = req;
    const projectId = query.id;

    switch (method) {
      case 'GET':
        return await handleGetProjects(res, projectId);
      case 'POST':
        return await handleCreateProject(res, body);
      case 'PUT':
        return await handleUpdateProject(res, projectId, body);
      case 'DELETE':
        return await handleDeleteProject(res, projectId);
      default:
        return errorResponse(res, 405, 'Method not allowed');
    }

  } catch (error) {
    console.error('Projects API error:', error);
    return errorResponse(res, 500, 'Operation failed', error.message);
  }
};

async function handleGetProjects(res, projectId) {
  try {
    if (projectId) {
      // Get specific project by ID
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error || !project) {
        return errorResponse(res, 404, 'Project not found');
      }

      return successResponse(res, project);
    } else {
      // Get all projects
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return successResponse(res, projects);
    }
  } catch (error) {
    console.error('Get projects error:', error);
    return errorResponse(res, 500, 'Failed to retrieve projects', error.message);
  }
}

async function handleCreateProject(res, body) {
  try {
    const { name, description, status, created_by } = body;

    if (!name) {
      return errorResponse(res, 400, 'Project name is required');
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert([
        {
          name: name,
          description: description || '',
          status: status || 'Active',
          created_by: created_by || null
        }
      ])
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return successResponse(res, project, 201);
  } catch (error) {
    console.error('Create project error:', error);
    return errorResponse(res, 500, 'Failed to create project', error.message);
  }
}
