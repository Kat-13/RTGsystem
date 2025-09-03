import React, { useState, useEffect } from 'react';
import RTGNavigation from './components/RTGNavigation';
import WhiteboardLevel from './components/WhiteboardLevel';
import ProgramBoardLevel from './components/ProgramBoardLevel';
import TracksLevel from './components/TracksLevel';
import ProgramView from './components/ProgramView';
import ScheduleLevel from './components/ScheduleLevel';
import { initializeDataIfEmpty } from './data/initialData.js';
import { supabase, database, auth } from './lib/supabase.js'; // <-- import supabase helpers!
import './App.css';

function App() {
  const [currentLevel, setCurrentLevel] = useState('program-board');
  const [currentProject, setCurrentProject] = useState(null); // <-- ADD THIS LINE
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    initializeDataIfEmpty();
  }, []);

  // Example: Create a default project for the logged-in user
  async function createDefaultProject() {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setErrorMsg('No authenticated user or error: ' + (userError?.message || 'Unknown error'));
        console.error('No authenticated user or error:', userError);
        setLoading(false);
        return;
      }
      const userId = userData.user.id;

      const { data: newProject, error: createError } = await database.createProject(
        'Default Project',
        'Your main project workspace',
        userId
      );
      if (createError) {
        setErrorMsg('Error creating project: ' + createError.message);
        console.error('Error creating project:', createError);
      } else {
        console.log('Created default project:', newProject);
      }
    } catch (err) {
      setErrorMsg('Unexpected error: ' + err.message);
      console.error('Unexpected error:', err);
    }
    setLoading(false);
  }

  // Uncomment to run on every load:
  // createDefaultProject();

  const renderCurrentLevel = () => {
    switch (currentLevel) {
      case 'whiteboard':
        return <WhiteboardLevel currentProject={currentProject} />;
      case 'program-board':
        return <ProgramBoardLevel currentProject={currentProject} />;
      case 'tracks':
        return <TracksLevel currentProject={currentProject} />;
      case 'schedule':
        return <ScheduleLevel currentProject={currentProject} />;
      case 'program-view':
        return <ProgramView currentProject={currentProject} />;
      default:
        return <ProgramBoardLevel currentProject={currentProject} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RTGNavigation
        currentLevel={currentLevel}
        onLevelChange={setCurrentLevel}
        currentProject={currentProject}
        onProjectChange={setCurrentProject}
      />
      <main>
        {loading && (
          <div>
            <div className="spinner" />
            <p>Loading RTG System...</p>
          </div>
        )}
        {errorMsg && (
          <div style={{ color: 'red', margin: '1em 0' }}>
            {errorMsg}
          </div>
        )}
        {!loading && !errorMsg && renderCurrentLevel()}
      </main>
    </div>
  );
}

export default App;
