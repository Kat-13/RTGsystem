// RTG Aligned Execution Data Model 
/*
 * rtgAEDataModel.js - Data Model Classes
 * VERSION: v2.1.1 - 2025-08-20 16:30:00
 * ENHANCEMENTS: Added User class for user management system
 * LAST MODIFIED: 2025-08-20 16:30:00
 */
import { ProjectAwareDataStorage } from './projectManager.js';

export class User {
  constructor(id, name, email, role = 'Team Member') {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role; // Team Member, Lead, Manager, etc.
    this.created_at = new Date().toISOString();
    this.active = true;
  }
}

export class WhiteboardNote {
  constructor(id, title, description, tags = [], stream = null) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.tags = tags;
    this.stream = stream;
    this.created_at = new Date().toISOString();
    this.promoted_to_l1 = false;
    this.promoted_at = null;
    this.promoted_to_deliverable_id = null;
  }
}

export class Stream {
  constructor(id, name, color, description = '') {
    this.id = id;
    this.name = name;
    this.color = color;
    this.description = description;
    this.created_at = new Date().toISOString();
  }
}

export class FunctionalDeliverable {
  constructor(id, title, description, stream_id, readiness = 'planning', target_date = null) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.stream_id = stream_id;
    this.readiness = readiness; // planning, ready, complete
    this.target_date = target_date;
    this.created_at = new Date().toISOString();
    this.promoted_from_l0 = null;
    this.checklist = [];
    this.dependencies = []; // Array of deliverable IDs that this depends on
    this.assigned_user_id = null; // ID of assigned user
    this.owner_name = '';
    this.owner_email = '';
    
    // Audit Trail Fields
    this.original_date = target_date || null; // Only set if target_date exists, never changes after first commit
    this.date_history = []; // Array of date changes with timestamps
    this.recommit_reasons = []; // Array of reasons for each change
    this.recommit_count = 0; // Number of times date was changed
    this.planning_accuracy_score = null; // Calculated metric (0-100)
    this.completed_at = null; // Actual completion date
  }

  // Method to add a date change to the audit trail
  addDateChange(old_date, new_date, reason, explanation = '', user = 'System') {
    const change = {
      id: ProjectAwareDataStorage.generateId(),
      old_date: old_date,
      new_date: new_date,
      reason: reason,
      explanation: explanation,
      changed_by: user,
      changed_at: new Date().toISOString()
    };
    
    this.date_history.push(change);
    this.recommit_reasons.push(reason);
    this.recommit_count = this.date_history.length;
    this.target_date = new_date;
    
    // Update planning accuracy score
    this.updatePlanningAccuracyScore();
  }

  // Calculate planning accuracy score (0-100, higher is better)
  updatePlanningAccuracyScore() {
    if (!this.original_date) {
      this.planning_accuracy_score = null;
      return;
    }

    // Base score starts at 100
    let score = 100;
    
    // Deduct points for each recommit (10 points per recommit)
    score -= (this.recommit_count * 10);
    
    // If completed, factor in actual vs original date
    if (this.completed_at && this.readiness === 'complete') {
      const originalDate = new Date(this.original_date);
      const completedDate = new Date(this.completed_at);
      const slipDays = Math.max(0, Math.ceil((completedDate - originalDate) / (1000 * 60 * 60 * 24)));
      
      // Deduct 2 points per slip day
      score -= (slipDays * 2);
    }
    
    // Ensure score doesn't go below 0
    this.planning_accuracy_score = Math.max(0, score);
  }

  // Get current slip days from original date
  getCurrentSlipDays() {
    if (!this.original_date) return 0;
    
    const originalDate = new Date(this.original_date);
    const currentDate = new Date();
    const targetDate = new Date(this.target_date);
    
    // If completed, use completion date; otherwise use current date
    const compareDate = this.readiness === 'complete' && this.completed_at 
      ? new Date(this.completed_at) 
      : currentDate;
    
    // Only count as slip if we're past the original date
    if (compareDate > originalDate) {
      return Math.ceil((compareDate - originalDate) / (1000 * 60 * 60 * 24));
    }
    
    return 0;
  }

  // Mark deliverable as complete
  markComplete() {
    this.readiness = 'complete';
    this.completed_at = new Date().toISOString();
    this.updatePlanningAccuracyScore();
  }
}

export class ChecklistItem {
  constructor(id, text, done = false) {
    this.id = id;
    this.text = text;
    this.done = done;
    this.created_at = new Date().toISOString();
    this.done_at = null;
  }
}

export class ExecutionTrack {
  constructor(id, title, description, deliverable_id, vendor = 'Unassigned', target_date = null) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.deliverable_id = deliverable_id;
    this.vendor = vendor;
    this.target_date = target_date;
    this.health = 'on_track'; // on_track, late, complete
    this.slip_days = 0;
    this.recommit_count = 0;
    this.recommit_history = [];
    this.created_at = new Date().toISOString();
    this.completed_at = null;
  }
}

// RTG AE Stream Colors
export const RTG_STREAM_COLORS = [
  { name: 'OHCA Blue', value: '#3B82F6' },
  { name: 'DMHSAS Purple', value: '#8B5CF6' },
  { name: 'Security Red', value: '#EF4444' },
  { name: 'Infrastructure Green', value: '#10B981' },
  { name: 'Compliance Orange', value: '#F59E0B' },
  { name: 'Analytics Teal', value: '#14B8A6' },
  { name: 'Operations Indigo', value: '#6366F1' },
  { name: 'Quality Pink', value: '#EC4899' },
  { name: 'Finance Emerald', value: '#059669' },
  { name: 'Legal Slate', value: '#64748B' }
];

// Data Storage Helper
export { ProjectAwareDataStorage } from './projectManager';

// Keep RTGDataStorage for backward compatibility (deprecated)
export class RTGDataStorage {
  static save(key, data) {
    localStorage.setItem(`rtg_ae_${key}`, JSON.stringify(data));
  }

  static load(key, defaultValue = []) {
    const stored = localStorage.getItem(`rtg_ae_${key}`);
    if (!stored) return defaultValue;
    
    const data = JSON.parse(stored);
    
    // Migrate functional deliverables to new format
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
    
    // Migrate execution tracks to new format
    if (key === 'execution_tracks' && Array.isArray(data)) {
      return data.map(track => {
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
    
    return data;
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
