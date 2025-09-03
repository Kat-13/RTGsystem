import { createClient } from '@supabase/supabase-js'

// Use Vite's import.meta.env for environment variables
// Hardcoded Supabase credentials for local testing.
// Get these from your Supabase project settings (API > Project URL & anon key).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Did you set them in .env and in Vercel?'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export const auth = {
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helper functions
export const database = {
  // Projects
  getProjects: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  createProject: async (name, description, userId) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ name, description, user_id: userId }])
      .select()
    return { data, error }
  },

  // Streams
  getStreams: async (projectId) => {
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    return { data, error }
  },

  saveStreams: async (projectId, streams) => {
    await supabase
      .from('streams')
      .delete()
      .eq('project_id', projectId)

    const streamsWithProjectId = streams.map(stream => ({
      ...stream,
      project_id: projectId
    }))

    const { data, error } = await supabase
      .from('streams')
      .insert(streamsWithProjectId)
      .select()
    return { data, error }
  },

  // Functional Deliverables
  getDeliverables: async (projectId) => {
    const { data, error } = await supabase
      .from('functional_deliverables')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    return { data, error }
  },

  saveDeliverables: async (projectId, deliverables) => {
    await supabase
      .from('functional_deliverables')
      .delete()
      .eq('project_id', projectId)

    const deliverablesWithProjectId = deliverables.map(deliverable => ({
      ...deliverable,
      project_id: projectId
    }))

    const { data, error } = await supabase
      .from('functional_deliverables')
      .insert(deliverablesWithProjectId)
      .select()
    return { data, error }
  },

  // Execution Tracks
  getTracks: async (projectId) => {
    const { data, error } = await supabase
      .from('execution_tracks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    return { data, error }
  },

  saveTracks: async (projectId, tracks) => {
    await supabase
      .from('execution_tracks')
      .delete()
      .eq('project_id', projectId)

    const tracksWithProjectId = tracks.map(track => ({
      ...track,
      project_id: projectId
    }))

    const { data, error } = await supabase
      .from('execution_tracks')
      .insert(tracksWithProjectId)
      .select()
    return { data, error }
  },

  // Whiteboard Notes
  getWhiteboardNotes: async (projectId) => {
    const { data, error } = await supabase
      .from('whiteboard_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    return { data, error }
  },

  saveWhiteboardNotes: async (projectId, notes) => {
    await supabase
      .from('whiteboard_notes')
      .delete()
      .eq('project_id', projectId)

    const notesWithProjectId = notes.map(note => ({
      ...note,
      project_id: projectId
    }))

    const { data, error } = await supabase
      .from('whiteboard_notes')
      .insert(notesWithProjectId)
      .select()
    return { data, error }
  }
}
