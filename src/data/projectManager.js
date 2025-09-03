// Project Management System for RTG AE
/*
 * projectManager.js - Multi-Project Data Management
 * VERSION: v2.1.3 - 2025-08-21 09:45:00
 * ENHANCEMENTS: Fixed user management methods, stable user loading
 * LAST MODIFIED: 2025-08-21 09:45:00
 */
// Handles multiple project isolation and data management

export class Project {
  constructor(id, name, description = '', created_at = null) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.created_at = created_at || new Date().toISOString();
  }
}

export class ProjectManager {
  static CURRENT_PROJECT_KEY = 'rtg_ae_current_project';
  static PROJECTS_KEY = 'rtg_ae_projects';
  static DEFAULT_PROJECT_ID = 'default';

  // Initialize project system - migrate existing data to default project
  static initialize() {
    const projects = this.getProjects();
    const currentProject = this.getCurrentProject();

    // If no projects exist, create default project and migrate existing data
    if (projects.length === 0) {
      const defaultProject = new Project(
        this.DEFAULT_PROJECT_ID,
        'Default Project',
        'Your initial project workspace'
      );
      
      this.saveProject(defaultProject);
      this.setCurrentProject(this.DEFAULT_PROJECT_ID);
      this.migrateExistingData();
    }

    // If no current project is set, set to default
    if (!currentProject) {
      this.setCurrentProject(this.DEFAULT_PROJECT_ID);
    }
  }

  // Migrate existing data to default project namespace
  static migrateExistingData() {
    const dataKeys = [
      'whiteboard_notes',
      'streams', 
      'functional_deliverables',
      'execution_tracks',
      'archived_streams'
    ];

    dataKeys.forEach(key => {
      const existingData = localStorage.getItem(`rtg_ae_${key}`);
      if (existingData) {
        // Move to project-specific key
        localStorage.setItem(`rtg_ae_project_${this.DEFAULT_PROJECT_ID}_${key}`, existingData);
        // Remove old key
        localStorage.removeItem(`rtg_ae_${key}`);
      }
    });
  }

  // Get all projects
  static getProjects() {
    const stored = localStorage.getItem(this.PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Save a project
  static saveProject(project) {
    const projects = this.getProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }
    
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
  }

  // Delete a project and all its data
  static deleteProject(projectId) {
    if (projectId === this.DEFAULT_PROJECT_ID) {
      throw new Error('Cannot delete the default project');
    }

    // Remove project from projects list
    const projects = this.getProjects().filter(p => p.id !== projectId);
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));

    // Remove all project data
    const dataKeys = [
      'whiteboard_notes',
      'streams', 
      'functional_deliverables',
      'execution_tracks',
      'archived_streams'
    ];

    dataKeys.forEach(key => {
      localStorage.removeItem(`rtg_ae_project_${projectId}_${key}`);
    });

    // If this was the current project, switch to default
    if (this.getCurrentProject() === projectId) {
      this.setCurrentProject(this.DEFAULT_PROJECT_ID);
    }
  }

  // Get current project ID
  static getCurrentProject() {
    return localStorage.getItem(this.CURRENT_PROJECT_KEY);
  }

  // Set current project
  static setCurrentProject(projectId) {
    localStorage.setItem(this.CURRENT_PROJECT_KEY, projectId);
  }

  // Get project by ID
  static getProject(projectId) {
    const projects = this.getProjects();
    return projects.find(p => p.id === projectId);
  }

  // Create new project
  static createProject(name, description = '') {
    const id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const project = new Project(id, name, description);
    this.saveProject(project);
    return project;
  }

  // Get project-specific data key
  static getProjectDataKey(key) {
    const currentProject = this.getCurrentProject();
    return `rtg_ae_project_${currentProject}_${key}`;
  }
}

// Enhanced RTGDataStorage that works with projects
export class ProjectAwareDataStorage {
  static save(key, data) {
    const projectKey = ProjectManager.getProjectDataKey(key);
    localStorage.setItem(projectKey, JSON.stringify(data));
  }

  static load(key, defaultValue = []) {
    const projectKey = ProjectManager.getProjectDataKey(key);
    const stored = localStorage.getItem(projectKey);
    if (!stored) return defaultValue;
    
    const data = JSON.parse(stored);
    
    // Apply same migrations as original RTGDataStorage
    if (key === 'functional_deliverables' && Array.isArray(data)) {
      return data.map(deliverable => {
        // Add missing fields for backward compatibility
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
    
    return data;
  }

  static clear(key) {
    const projectKey = ProjectManager.getProjectDataKey(key);
    localStorage.removeItem(projectKey);
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // User Management Methods
  static saveUsers(users) {
    this.save('users', users);
  }

  static loadUsers() {
    return this.load('users', []);
  }

  static addUser(user) {
    const users = this.loadUsers();
    users.push(user);
    this.saveUsers(users);
    return user;
  }

  static updateUser(userId, updatedUser) {
    const users = this.loadUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedUser };
      this.saveUsers(users);
      return users[index];
    }
    return null;
  }

  static deleteUser(userId) {
    const users = this.loadUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    this.saveUsers(filteredUsers);
    return filteredUsers;
  }

  static getUserById(userId) {
    const users = this.loadUsers();
    return users.find(u => u.id === userId) || null;
  }
}
