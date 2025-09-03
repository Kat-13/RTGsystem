import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

const RTGNavigation = ({ currentLevel, onLevelChange, currentProject, onProjectChange }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject_internal, setCurrentProject_internal] = useState(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch projects once on mount, using Supabase client (no query-string REST)
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const { data: userRes, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userRes?.user) {
        setProjects([]);
        setCurrentProject_internal(null);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting projects:', error);
        setProjects([]);
      } else {
        const list = data || [];
        setProjects(list);

        // If nothing selected yet, default to first project (if any)
        if (!currentProject && list.length > 0) {
          const firstProject = list[0];
          setCurrentProject_internal(firstProject);
          // Notify App.jsx of the initial project selection
          if (onProjectChange) {
            onProjectChange(firstProject);
          }
        }
      }
    } finally {
      setLoadingProjects(false);
    }
  }, [currentProject, onProjectChange]);

  useEffect(() => {
    loadProjects(); // run once
  }, [loadProjects]);

  const handleProjectSwitch = (projectId) => {
    const project = projects.find((proj) => proj.id === projectId);
    if (project) {
      setCurrentProject_internal(project);
      setShowProjectDropdown(false);
      // Notify App.jsx of the project change
      if (onProjectChange) {
        onProjectChange(project);
      }
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const { data: userRes, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userRes?.user) {
        console.error('Not authenticated');
        return;
      }
      const { user } = userRes;

      // Insert with user_id as owner
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          description: null,
          user_id: user.id,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Create project failed:', error);
        return;
      }

      // Refresh list & select the new project (no reload)
      await loadProjects();
      setCurrentProject_internal(data || null);
      setNewProjectName('');
      setShowNewProjectModal(false);
      // Notify App.jsx of the new project
      if (onProjectChange && data) {
        onProjectChange(data);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Optional: navigate to a public route
    window.location.assign('/');
  };

  const levels = [
    { id: 'whiteboard', label: 'L0 Whiteboard' },
    { id: 'program-board', label: 'L1 Program Board' },
    { id: 'tracks', label: 'L2 Monitoring' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'program-view', label: 'Executive View' },
  ];

  // Use the currentProject prop from App.jsx if available, otherwise fall back to internal state
  const displayProject = currentProject || currentProject_internal;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 font-bold text-sm">RTG</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">RTG Aligned Execution</h1>
              <p className="text-xs text-gray-500">FastLynk Software</p>
            </div>
          </div>

          {/* Project Selector */}
          <div className="relative ml-8">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingProjects}
            >
              <span>
                {loadingProjects
                  ? 'Loading projects...'
                  : displayProject?.name || 'Select Project'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showProjectDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <div className="py-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSwitch(project.id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        displayProject?.id === project.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{project.name}</div>
                      {project.description && (
                        <div className="text-xs text-gray-500">{project.description}</div>
                      )}
                    </button>
                  ))}
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setShowProjectDropdown(false);
                      setShowNewProjectModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>

        {/* Level Navigation */}
        <div className="flex space-x-8 mt-4">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => onLevelChange(level.id)}
              className={`pb-2 text-sm font-medium border-b-2 ${
                currentLevel === level.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Create New Project</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name..."
                disabled={creating}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creating}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                disabled={creating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RTGNavigation;
