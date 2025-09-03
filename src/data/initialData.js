// Initial data for RTG AE System
// This data will be automatically loaded on first app initialization 

export const INITIAL_RTG_DATA = {
  "rtg_ae_whiteboard_notes": "[]",
  "rtg_ae_streams": "[{\"id\":\"getting_started\",\"name\":\"Getting Started\",\"color\":\"#3B82F6\",\"description\":\"Training and setup guidance\",\"created_at\":\"2025-08-21T00:00:00.000Z\"}]",
  "rtg_ae_functional_deliverables": "[{\"id\":\"training_card_001\",\"title\":\"RTG System Quick Start Guide\",\"description\":\"Welcome to your RTG Program Board! This interactive guide will help you learn the key features.\",\"stream_id\":\"getting_started\",\"readiness\":\"ready\",\"target_date\":null,\"created_at\":\"2025-08-21T00:00:00.000Z\",\"promoted_from_l0\":null,\"checklist\":[{\"id\":\"guide_001\",\"text\":\"Click the collapse button to minimize streams\",\"done\":false,\"created_at\":\"2025-08-21T00:00:00.000Z\"},{\"id\":\"guide_002\",\"text\":\"Drag cards between streams to reorganize\",\"done\":false,\"created_at\":\"2025-08-21T00:00:00.000Z\"},{\"id\":\"guide_003\",\"text\":\"Use the Add Deliverable button to create new cards\",\"done\":false,\"created_at\":\"2025-08-21T00:00:00.000Z\"},{\"id\":\"guide_004\",\"text\":\"Click on any card to edit details and add checklists\",\"done\":false,\"created_at\":\"2025-08-21T00:00:00.000Z\"},{\"id\":\"guide_005\",\"text\":\"Set readiness levels: Planning to Alignment to Ready to Executing to Review to Complete\",\"done\":false,\"created_at\":\"2025-08-21T00:00:00.000Z\"},{\"id\":\"guide_006\",\"text\":\"Add dependencies between deliverables\",\"done\":false,\"created_at\":\"2025-08-21T00:00:00.000Z\"},{\"id\":\"guide_007\",\"text\":\"Check off checklist items as you complete them\",\"done\":false,\"created_at\":\"2025-08-21T00:00:00.000Z\"},{\"id\":\"guide_008\",\"text\":\"Delete this card when you are ready to start your real project\",\"done\":false,\"created_at\":\"2025-08-21T00:00:00.000Z\"}],\"owner_name\":\"RTG System\",\"owner_email\":\"support@rtgsystem.com\",\"comments\":[{\"id\":\"welcome_comment\",\"text\":\"Pro tip: Try each feature as you check it off! This card demonstrates all the key functionality you will use in your projects.\",\"timestamp\":\"2025-08-21T00:00:00.000Z\",\"author\":\"RTG Guide\"}],\"dependencies\":[],\"recommit_count\":0,\"recommit_history\":[]}]",
  "rtg_ae_execution_tracks": "[]"
};

// Function to initialize data if localStorage is empty
export function initializeDataIfEmpty() {
  // Check if any actual data exists (ignore project management keys)
  let hasData = false;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('rtg_ae_project_') && 
        (key.includes('_streams') || key.includes('_functional_deliverables') || 
         key.includes('_whiteboard_notes') || key.includes('_execution_tracks'))) {
      hasData = true;
      break;
    }
  }
  
  // If no actual data exists, load the initial training data into project format
  if (!hasData) {
    console.log('No RTG data found, loading initial training data...');
    
    // Set up default project if it doesn't exist
    if (!localStorage.getItem('rtg_ae_projects')) {
      const defaultProject = {
        id: 'default',
        name: 'Default Project',
        description: 'Your initial project workspace',
        created_at: new Date().toISOString()
      };
      
      localStorage.setItem('rtg_ae_projects', JSON.stringify([defaultProject]));
      localStorage.setItem('rtg_ae_current_project', 'default');
    }
    
    // Load training data into project-specific format
    const projectId = 'default';
    const trainingData = {
      streams: INITIAL_RTG_DATA.rtg_ae_streams,
      functional_deliverables: INITIAL_RTG_DATA.rtg_ae_functional_deliverables,
      whiteboard_notes: INITIAL_RTG_DATA.rtg_ae_whiteboard_notes,
      execution_tracks: INITIAL_RTG_DATA.rtg_ae_execution_tracks
    };
    
    Object.keys(trainingData).forEach(key => {
      localStorage.setItem(`rtg_ae_project_${projectId}_${key}`, trainingData[key]);
    });
    
    console.log('Initial training data loaded successfully!');
    return true;
  }
  
  return false;
}

