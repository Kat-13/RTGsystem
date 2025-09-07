import { database } from '../lib/supabase';

class DataService {
  constructor() {
    this.currentProjectId = null;
  }

  // Initialize user's default project
  async initializeUserProject(userId) {
    try {
      // Check if user already has projects
      const { data: projects, error } = await database.getProjects();

      if (error) {
        console.error('Error getting projects:', error);
        return null;
      }

      if (projects && projects.length > 0) {
        // User has existing projects, use the first one
        this.currentProjectId = projects[0].id;
        return projects[0];
      }

      // Create default project for new user -- PASS userId as third argument!
      const { data: newProject, error: createError } = await database.createProject(
        'Default Project',
        'Your main project workspace',
        userId // <-- Pass userId here!
      );

      if (createError) {
        console.error('Error creating project:', createError);
        return null;
      }

      // FIX: Add proper null checking before accessing array element
      if (newProject && newProject.length > 0) {
        this.currentProjectId = newProject[0].id;
      } else {
        console.error('No project data returned from createProject');
        return null;
      }

      // Initialize with starter data (the training card)
      await this.createStarterData(userId);

      // FIX: Add proper null checking before returning array element
      return newProject && newProject.length > 0 ? newProject[0] : null;
    } catch (error) {
      console.error('Error initializing user project:', error);
      return null;
    }
  }

  async createStarterData(userId) {
    // Create the "Getting Started" stream
    const starterStream = {
      id: 'getting_started',
      name: 'Getting Started',
      color: '#3B82F6',
      description: 'Training and setup guidance',
      user_id: userId
    };

    await database.saveStreams(this.currentProjectId, [starterStream]);

    // Create the training deliverable
    const starterDeliverable = {
      id: 'training_card_001',
      title: 'RTG System Quick Start Guide',
      description: 'Welcome to your RTG Program Board! This interactive guide will help you learn the key features.',
      stream_id: 'getting_started',
      readiness: 'ready',
      target_date: null,
      promoted_from_l0: null,
      checklist: [
        { id: 'guide_001', text: 'Click the collapse button to minimize streams', done: false, created_at: new Date().toISOString() },
        { id: 'guide_002', text: 'Drag cards between streams to reorganize', done: false, created_at: new Date().toISOString() },
        { id: 'guide_003', text: 'Use the Add Deliverable button to create new cards', done: false, created_at: new Date().toISOString() },
        { id: 'guide_004', text: 'Click on any card to edit details and add checklists', done: false, created_at: new Date().toISOString() },
        { id: 'guide_005', text: 'Set readiness levels: Planning to Alignment to Ready to Executing to Review to Complete', done: false, created_at: new Date().toISOString() },
        { id: 'guide_006', text: 'Add dependencies between deliverables', done: false, created_at: new Date().toISOString() },
        { id: 'guide_007', text: 'Check off checklist items as you complete them', done: false, created_at: new Date().toISOString() },
        { id: 'guide_008', text: 'Delete this card when you are ready to start your real project', done: false, created_at: new Date().toISOString() }
      ],
      owner_name: 'RTG System',
      owner_email: 'support@rtgsystem.com',
      comments: [
        {
          id: 'welcome_comment',
          text: 'Pro tip: Try each feature as you check it off! This card demonstrates all the key functionality you will use in your projects.',
          timestamp: new Date().toISOString(),
          author: 'RTG Guide'
        }
      ],
      dependencies: [],
      recommit_count: 0,
      recommit_history: [],
      user_id: userId
    };

    await database.saveDeliverables(this.currentProjectId, [starterDeliverable]);
  }

  // Simple data methods that work directly with Supabase
  async getStreams() {
    if (!this.currentProjectId) return [];

    try {
      const { data, error } = await database.getStreams(this.currentProjectId);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading streams:', error);
      return [];
    }
  }

  async saveStreams(userId, streams) {
    if (!this.currentProjectId) return { success: false, error: 'No project selected' };

    try {
      const streamsWithUserId = streams.map(stream => ({
        ...stream,
        user_id: userId
      }));
      const { error } = await database.saveStreams(this.currentProjectId, streamsWithUserId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error saving streams:', error);
      return { success: false, error: error.message };
    }
  }

  async getDeliverables() {
    if (!this.currentProjectId) return [];

    try {
      const { data, error } = await database.getDeliverables(this.currentProjectId);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading deliverables:', error);
      return [];
    }
  }

  async saveDeliverables(userId, deliverables) {
    if (!this.currentProjectId) return { success: false, error: 'No project selected' };

    try {
      const deliverablesWithUserId = deliverables.map(deliverable => ({
        ...deliverable,
        user_id: userId
      }));
      const { error } = await database.saveDeliverables(this.currentProjectId, deliverablesWithUserId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error saving deliverables:', error);
      return { success: false, error: error.message };
    }
  }

  async getTracks() {
    if (!this.currentProjectId) return [];

    try {
      const { data, error } = await database.getTracks(this.currentProjectId);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading tracks:', error);
      return [];
    }
  }

  async saveTracks(userId, tracks) {
    if (!this.currentProjectId) return { success: false, error: 'No project selected' };

    try {
      const tracksWithUserId = tracks.map(track => ({
        ...track,
        user_id: userId
      }));
      const { error } = await database.saveTracks(this.currentProjectId, tracksWithUserId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error saving tracks:', error);
      return { success: false, error: error.message };
    }
  }

  async getWhiteboardNotes() {
    if (!this.currentProjectId) return [];

    try {
      const { data, error } = await database.getWhiteboardNotes(this.currentProjectId);
      if (error) throw error;

      // Convert database format to app format for compatibility
      return (data || []).map(note => ({
        text: note.content,
        content: note.content,
        position: note.position || { x: 0, y: 0 },
        id: note.id
      }));
    } catch (error) {
      console.error('Error loading whiteboard notes:', error);
      return [];
    }
  }

  async saveWhiteboardNotes(userId, notes) {
    if (!this.currentProjectId) return { success: false, error: 'No project selected' };

    try {
      // Convert app format to database format
      const processedNotes = notes.map(note => ({
        id: note.id || crypto.randomUUID(),
        content: note.text || note.content || '',
        position: note.position || { x: 0, y: 0 },
        user_id: userId
      }));

      const { error } = await database.saveWhiteboardNotes(this.currentProjectId, processedNotes);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error saving whiteboard notes:', error);
      return { success: false, error: error.message };
    }
  }

  // All other methods in your original file, unchanged
  // ... (insert non-project-related methods here, if any)
}

export default new DataService();
