import { v4 as uuid } from 'uuid'; 
import { getCurrentProjectId } from './currentProject';
import {
  listStreams, listDeliverables, createStream, updateStream, deleteStream,
  upsertDeliverable, deleteDeliverable
} from './projectService';

export const ProjectAwareDataStorage = {
  generateId: () => uuid(),

  // mimic load/save per "key"
  async load(key, fallback) {
    const pid = getCurrentProjectId();
    if (!pid) return fallback;

    if (key === 'streams') return await listStreams(pid);
    if (key === 'functional_deliverables') return await listDeliverables(pid);
    if (key === 'whiteboard_notes') return []; // you can wire this later to a table
    return fallback;
  },

  async save(key, value) {
    const pid = getCurrentProjectId();
    if (!pid) return;

    if (key === 'streams') {
      // naive sync: upsert or delete by diff if you add that later.
      // For now handle updates via explicit handlers in your component.
      return;
    }
    if (key === 'functional_deliverables') {
      return; // component already calls upsert/delete helpers below
    }
  },

  // helpers your component can call directly
  async createStream(streamData) {
    const pid = getCurrentProjectId();
    if (!pid) throw new Error('No current project');
    return await createStream(pid, streamData);
  },
  async updateStream(streamId, patch) { return await updateStream(streamId, patch); },
  async deleteStream(streamId) { return await deleteStream(streamId); },

  async upsertDeliverable(row) {
    const pid = getCurrentProjectId();
    if (!pid) throw new Error('No current project');
    return await upsertDeliverable(pid, row);
  },
  async deleteDeliverable(id) { return await deleteDeliverable(id); },

  // keep your UI stable
  loadUsers() { return []; },
};
