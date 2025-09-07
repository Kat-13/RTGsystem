import { supabase } from '../lib/supabase';

// Data service to replace localStorage with Supabase
export class DataService {
  constructor(userId) {
    this.userId = userId;
  }

  // Projects
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', this.userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async createProject(projectData) {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...projectData,
        created_by: this.userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Streams
  async getStreams(projectId) {
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createStream(streamData) {
    const { data, error } = await supabase
      .from('streams')
      .insert([streamData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateStream(streamId, updates) {
    const { data, error } = await supabase
      .from('streams')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', streamId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteStream(streamId) {
    const { error } = await supabase
      .from('streams')
      .delete()
      .eq('id', streamId);
    
    if (error) throw error;
  }

  // Functional Deliverables
  async getDeliverables(projectId) {
    const { data, error } = await supabase
      .from('functional_deliverables')
      .select(`
        *,
        checklist_items (*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createDeliverable(deliverableData) {
    const { data, error } = await supabase
      .from('functional_deliverables')
      .insert([deliverableData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateDeliverable(deliverableId, updates) {
    const { data, error } = await supabase
      .from('functional_deliverables')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', deliverableId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteDeliverable(deliverableId) {
    const { error } = await supabase
      .from('functional_deliverables')
      .delete()
      .eq('id', deliverableId);
    
    if (error) throw error;
  }

  // Checklist Items
  async getChecklistItems(deliverableId) {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('deliverable_id', deliverableId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createChecklistItem(itemData) {
    const { data, error } = await supabase
      .from('checklist_items')
      .insert([itemData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateChecklistItem(itemId, updates) {
    const { data, error } = await supabase
      .from('checklist_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteChecklistItem(itemId) {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId);
    
    if (error) throw error;
  }

  // Utility methods for RTG compatibility
  async initializeDefaultProject() {
    // Create a default project for new users
    const defaultProject = await this.createProject({
      name: 'Default Project',
      description: 'Your RTG workspace',
      status: 'Active'
    });

    return defaultProject;
  }

  // Migration helper - convert localStorage data to Supabase
  async migrateFromLocalStorage() {
    try {
      // Check if user already has data in Supabase
      const existingProjects = await this.getProjects();
      if (existingProjects.length > 0) {
        return; // User already has cloud data
      }

      // Get localStorage data
      const localStreams = JSON.parse(localStorage.getItem('rtg_ae_project_default_streams') || '[]');
      const localDeliverables = JSON.parse(localStorage.getItem('rtg_ae_project_default_functional_deliverables') || '[]');

      if (localStreams.length === 0 && localDeliverables.length === 0) {
        return; // No local data to migrate
      }

      // Create default project
      const project = await this.initializeDefaultProject();

      // Migrate streams
      const streamMapping = {};
      for (const localStream of localStreams) {
        const newStream = await this.createStream({
          project_id: project.id,
          name: localStream.name,
          description: localStream.description || '',
          color: localStream.color || '#3B82F6',
          collapsed: localStream.collapsed || false
        });
        streamMapping[localStream.id] = newStream.id;
      }

      // Migrate deliverables
      for (const localDeliverable of localDeliverables) {
        const newDeliverable = await this.createDeliverable({
          project_id: project.id,
          stream_id: streamMapping[localDeliverable.stream_id],
          title: localDeliverable.title,
          description: localDeliverable.description || '',
          target_date: localDeliverable.target_date,
          original_date: localDeliverable.original_date,
          assigned_user: localDeliverable.assigned_user || '',
          owner: localDeliverable.owner || '',
          status: localDeliverable.status || 'Not Started',
          priority: localDeliverable.priority || 'Medium',
          planning_accuracy_score: localDeliverable.planning_accuracy_score || 100
        });

        // Migrate checklist items
        if (localDeliverable.checklist && localDeliverable.checklist.length > 0) {
          for (const item of localDeliverable.checklist) {
            await this.createChecklistItem({
              deliverable_id: newDeliverable.id,
              text: item.text,
              done: item.done || false,
              done_at: item.done ? new Date().toISOString() : null
            });
          }
        }
      }

      console.log('✅ Successfully migrated localStorage data to Supabase');
    } catch (error) {
      console.error('❌ Error migrating localStorage data:', error);
    }
  }
}

// Helper function to get data service instance
export const getDataService = (user) => {
  if (!user?.sub) {
    throw new Error('User not authenticated');
  }
  return new DataService(user.sub);
};
