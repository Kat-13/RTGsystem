// Supabase Service - Complete replacement for ProjectAwareDataStorage
// File: src/data/supabaseService.js

import { supabase } from '../lib/supabase';

export class SupabaseProjectStorage {
  static currentProjectId = null;

  // Set current project (replaces ProjectManager.setCurrentProject)
  static setCurrentProject(projectId) {
    this.currentProjectId = projectId;
    localStorage.setItem('rtg_ae_current_project', projectId);
  }

  // Get current project (replaces ProjectManager.getCurrentProject)
  static getCurrentProject() {
    if (!this.currentProjectId) {
      this.currentProjectId = localStorage.getItem('rtg_ae_current_project');
    }
    return this.currentProjectId;
  }

  // Save data to Supabase (replaces ProjectAwareDataStorage.save)
  static async save(key, data) {
    const projectId = this.getCurrentProject();
    if (!projectId) throw new Error('No current project set');

    try {
      switch (key) {
        case 'functional_deliverables':
          await this.saveFunctionalDeliverables(projectId, data);
          break;
        case 'streams':
          await this.saveStreams(projectId, data);
          break;
        case 'whiteboard_notes':
          await this.saveWhiteboardNotes(projectId, data);
          break;
        case 'execution_tracks':
          await this.saveExecutionTracks(projectId, data);
          break;
        case 'users':
          await this.saveUsers(projectId, data);
          break;
        default:
          console.warn(`Unknown data type: ${key}`);
      }
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }

  // Load data from Supabase (replaces ProjectAwareDataStorage.load)
  static async load(key, defaultValue = []) {
    const projectId = this.getCurrentProject();
    if (!projectId) return defaultValue;

    try {
      switch (key) {
        case 'functional_deliverables':
          return await this.loadFunctionalDeliverables(projectId) || defaultValue;
        case 'streams':
          return await this.loadStreams(projectId) || defaultValue;
        case 'whiteboard_notes':
          return await this.loadWhiteboardNotes(projectId) || defaultValue;
        case 'execution_tracks':
          return await this.loadExecutionTracks(projectId) || defaultValue;
        case 'users':
          return await this.loadUsers(projectId) || defaultValue;
        default:
          console.warn(`Unknown data type: ${key}`);
          return defaultValue;
      }
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return defaultValue;
    }
  }

  // Generate ID (replaces ProjectAwareDataStorage.generateId)
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Functional Deliverables operations
  static async saveFunctionalDeliverables(projectId, deliverables) {
    // Delete existing deliverables for this project
    await supabase
      .from('functional_deliverables')
      .delete()
      .eq('project_id', projectId);

    // Insert new deliverables
    if (deliverables.length > 0) {
      const { error } = await supabase
        .from('functional_deliverables')
        .insert(deliverables.map(d => ({
          ...d,
          project_id: projectId
        })));
      
      if (error) throw error;
    }
  }

  static async loadFunctionalDeliverables(projectId) {
    const { data, error } = await supabase
      .from('functional_deliverables')
      .select('*')
      .eq('project_id', projectId)
      .order('order', { ascending: true });

    if (error) throw error;

    // Apply same migrations as original RTGDataStorage
    return (data || []).map(deliverable => {
      if (!deliverable.hasOwnProperty('original_date')) {
        deliverable.original_date = deliverable.target_date;
      }
      if (!deliverable.hasOwnProperty('date_history')) {
        deliverable.date_history = [];
      }
      if (!deliverable.hasOwnProperty('recommit_reasons')) {
        deliverable.recommit_reasons = [];
      }
      if (!deliverable.hasOwnProperty('recommit_count')) {
        deliverable.recommit_count = 0;
      }
      if (!deliverable.hasOwnProperty('planning_accuracy_score')) {
        deliverable.planning_accuracy_score = 100;
      }
      if (!deliverable.hasOwnProperty('completed_at')) {
        deliverable.completed_at = null;
      }
      if (!deliverable.hasOwnProperty('checklist')) {
        deliverable.checklist = [];
      }
      if (!deliverable.hasOwnProperty('dependencies')) {
        deliverable.dependencies = [];
      }
      return deliverable;
    });
  }

  // Streams operations
  static async saveStreams(projectId, streams) {
    // Delete existing streams for this project
    await supabase
      .from('streams')
      .delete()
      .eq('project_id', projectId);

    // Insert new streams
    if (streams.length > 0) {
      const { error } = await supabase
        .from('streams')
        .insert(streams.map(s => ({
          ...s,
          project_id: projectId,
          id: s.id || this.generateId() // Ensure ID exists
        })));
      
      if (error) throw error;
    }
  }

  static async loadStreams(projectId) {
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .eq('project_id', projectId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Whiteboard Notes operations
  static async saveWhiteboardNotes(projectId, notes) {
    // Delete existing notes for this project
    await supabase
      .from('whiteboard_notes')
      .delete()
      .eq('project_id', projectId);

    // Insert new notes
    if (notes.length > 0) {
      const { error } = await supabase
        .from('whiteboard_notes')
        .insert(notes.map(n => ({
          ...n,
          project_id: projectId
        })));
      
      if (error) throw error;
    }
  }

  static async loadWhiteboardNotes(projectId) {
    const { data, error } = await supabase
      .from('whiteboard_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Execution Tracks operations
  static async saveExecutionTracks(projectId, tracks) {
    // Delete existing tracks for this project
    await supabase
      .from('execution_tracks')
      .delete()
      .eq('project_id', projectId);

    // Insert new tracks
    if (tracks.length > 0) {
      const { error } = await supabase
        .from('execution_tracks')
        .insert(tracks.map(t => ({
          ...t,
          project_id: projectId
        })));
      
      if (error) throw error;
    }
  }

  static async loadExecutionTracks(projectId) {
    const { data, error } = await supabase
      .from('execution_tracks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Apply same migrations as original RTGDataStorage
    return (data || []).map(track => {
      if (!track.hasOwnProperty('recommit_count')) {
        track.recommit_count = 0;
      }
      if (!track.hasOwnProperty('recommit_history')) {
        track.recommit_history = [];
      }
      if (!track.hasOwnProperty('completed_at')) {
        track.completed_at = null;
      }
      return track;
    });
  }

  // Users operations
  static async saveProjectUsers(projectId, users) {
    // Delete existing users for this project
    await supabase
      .from('users')
      .delete()
      .eq('project_id', projectId);

    // Insert new users
    if (users.length > 0) {
      const { error } = await supabase
        .from('users')
        .insert(users.map(u => ({
          ...u,
          project_id: projectId
        })));
      
      if (error) throw error;
    }
  }

  static async loadProjectUsers(projectId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // User management methods (replaces ProjectAwareDataStorage user methods)
  static async saveUsers(users) {
    const projectId = this.getCurrentProject();
    return this.saveProjectUsers(projectId, users);
  }

  static async loadUsers() {
    const projectId = this.getCurrentProject();
    return this.loadProjectUsers(projectId);
  }

  static async addUser(user) {
    const users = await this.loadUsers();
    users.push(user);
    await this.saveUsers(users);
    return user;
  }

  static async updateUser(userId, updatedUser) {
    const users = await this.loadUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedUser };
      await this.saveUsers(users);
      return users[index];
    }
    return null;
  }

  static async deleteUser(userId) {
    const users = await this.loadUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    await this.saveUsers(filteredUsers);
    return filteredUsers;
  }

  static async getUserById(userId) {
    const users = await this.loadUsers();
    return users.find(u => u.id === userId) || null;
  }

  // Project management methods (using user_id only)
  static async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createProject(name, description = '') {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        user_id: user.user.id  // Only user_id, no owner_id
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as project member
    await supabase
      .from('project_members')
      .insert({
        project_id: data.id,
        user_id: user.user.id,
        role: 'owner'
      });

    return data;
  }

  static async deleteProject(projectId) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    // Clear current project if it was deleted
    if (this.getCurrentProject() === projectId) {
      this.setCurrentProject(null);
    }
  }
}
