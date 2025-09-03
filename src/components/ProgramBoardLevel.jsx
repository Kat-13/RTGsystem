import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MoreHorizontal, ChevronDown, ChevronRight, Archive, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ProgramBoardLevel Component - L1 Program Board
// Functional deliverables organized by streams
const ProgramBoardLevel = ({ currentProject }) => {
  const [streams, setStreams] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsedStreams, setCollapsedStreams] = useState(new Set());
  const [newStreamName, setNewStreamName] = useState('');
  const [showNewStreamForm, setShowNewStreamForm] = useState(false);
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [showNewDeliverableForm, setShowNewDeliverableForm] = useState(null);

  // Load data function
  const loadData = useCallback(async () => {
    if (!currentProject?.id) {
      console.log('No current project selected');
      setStreams([]);
      setDeliverables([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading data for project:', currentProject.id);

      // Load streams for current project
      const { data: streamsData, error: streamsError } = await supabase
        .from('streams')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: true });

      if (streamsError) {
        console.error('Error loading streams:', streamsError);
        throw streamsError;
      }

      // Load functional deliverables for current project
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from('functional_deliverables')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: true });

      if (deliverablesError) {
        console.error('Error loading deliverables:', deliverablesError);
        throw deliverablesError;
      }

      console.log('Loaded streams:', streamsData);
      console.log('Loaded deliverables:', deliverablesData);

      setStreams(streamsData || []);
      setDeliverables(deliverablesData || []);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  // Load data when component mounts or project changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create new stream
  const handleCreateStream = async () => {
    if (!newStreamName.trim() || !currentProject?.id) return;

    try {
      const { data, error } = await supabase
        .from('streams')
        .insert([{
          name: newStreamName.trim(),
          project_id: currentProject.id,
          color: getRandomColor()
        }])
        .select('*')
        .single();

      if (error) throw error;

      setStreams(prev => [...prev, data]);
      setNewStreamName('');
      setShowNewStreamForm(false);
    } catch (err) {
      console.error('Error creating stream:', err);
      setError(err.message);
    }
  };

  // Create new deliverable
  const handleCreateDeliverable = async (streamId) => {
    if (!newDeliverableName.trim() || !currentProject?.id) return;

    try {
      const { data, error } = await supabase
        .from('functional_deliverables')
        .insert([{
          title: newDeliverableName.trim(),
          stream_id: streamId,
          project_id: currentProject.id,
          readiness: 'planning'
        }])
        .select('*')
        .single();

      if (error) throw error;

      setDeliverables(prev => [...prev, data]);
      setNewDeliverableName('');
      setShowNewDeliverableForm(null);
    } catch (err) {
      console.error('Error creating deliverable:', err);
      setError(err.message);
    }
  };

  // Get random color for new streams
  const getRandomColor = () => {
    const colors = ['blue', 'green', 'red', 'purple', 'orange', 'teal', 'pink'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Toggle stream collapse
  const toggleStreamCollapse = (streamId) => {
    setCollapsedStreams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(streamId)) {
        newSet.delete(streamId);
      } else {
        newSet.add(streamId);
      }
      return newSet;
    });
  };

  // Get deliverables for a specific stream
  const getStreamDeliverables = (streamId) => {
    return deliverables.filter(d => d.stream_id === streamId);
  };

  // Get color class for stream
  const getStreamColorClass = (color) => {
    const colorMap = {
      blue: 'border-blue-500 bg-blue-50',
      green: 'border-green-500 bg-green-50',
      red: 'border-red-500 bg-red-50',
      purple: 'border-purple-500 bg-purple-50',
      orange: 'border-orange-500 bg-orange-50',
      teal: 'border-teal-500 bg-teal-50',
      pink: 'border-pink-500 bg-pink-50'
    };
    return colorMap[color] || 'border-gray-500 bg-gray-50';
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Show message when no project is selected
  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Please select a project to view streams and deliverables.</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">L1 Program Board</h1>
          <p className="text-gray-600">Functional deliverables organized by streams</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewStreamForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Stream
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Deliverable
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stream Filter */}
      <div className="mb-6">
        <select className="px-3 py-2 border border-gray-300 rounded-lg bg-white">
          <option>All Streams</option>
          {streams.map(stream => (
            <option key={stream.id} value={stream.id}>{stream.name}</option>
          ))}
        </select>
      </div>

      {/* New Stream Form */}
      {showNewStreamForm && (
        <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={newStreamName}
              onChange={(e) => setNewStreamName(e.target.value)}
              placeholder="Stream name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              autoFocus
            />
            <button
              onClick={handleCreateStream}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewStreamForm(false);
                setNewStreamName('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Streams */}
      <div className="space-y-4">
        {streams.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No streams found for this project. Create your first stream to get started.</p>
          </div>
        ) : (
          streams.map(stream => {
            const streamDeliverables = getStreamDeliverables(stream.id);
            const isCollapsed = collapsedStreams.has(stream.id);

            return (
              <div
                key={stream.id}
                className={`border-l-4 rounded-lg ${getStreamColorClass(stream.color)}`}
              >
                {/* Stream Header */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleStreamCollapse(stream.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <div className={`w-3 h-3 rounded-full bg-${stream.color}-500`}></div>
                      <h3 className="font-semibold text-gray-900">{stream.name}</h3>
                      <span className="text-sm text-gray-500">({streamDeliverables.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowNewDeliverableForm(stream.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button className="text-gray-500 hover:text-gray-700">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* New Deliverable Form */}
                  {showNewDeliverableForm === stream.id && (
                    <div className="mt-4 p-3 border border-gray-300 rounded-lg bg-white">
                      <div className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={newDeliverableName}
                          onChange={(e) => setNewDeliverableName(e.target.value)}
                          placeholder="Deliverable title"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          autoFocus
                        />
                        <button
                          onClick={() => handleCreateDeliverable(stream.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setShowNewDeliverableForm(null);
                            setNewDeliverableName('');
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Deliverables */}
                  {!isCollapsed && (
                    <div className="mt-4 space-y-3">
                      {streamDeliverables.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No active deliverables in this stream</p>
                        </div>
                      ) : (
                        streamDeliverables.map(deliverable => (
                          <div
                            key={deliverable.id}
                            className="p-4 bg-white border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{deliverable.title}</h4>
                                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                                  deliverable.readiness === 'ready' ? 'bg-green-100 text-green-800' :
                                  deliverable.readiness === 'complete' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {deliverable.readiness}
                                </span>
                              </div>
                              <button className="text-gray-500 hover:text-gray-700">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                            {deliverable.description && (
                              <p className="text-sm text-gray-600 mt-2">{deliverable.description}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProgramBoardLevel;
