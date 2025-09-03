import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import ExportButton from './ExportButton';
import { supabase } from '../lib/supabase';

const ProgramBoardLevel = ({ currentProject }) => {
  const [streams, setStreams] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStream, setSelectedStream] = useState('all');
  const [collapsedStreams, setCollapsedStreams] = useState(new Set());
  const [collapsedCards, setCollapsedCards] = useState(new Set());
  const [showNewStreamModal, setShowNewStreamModal] = useState(false);
  const [showNewDeliverableModal, setShowNewDeliverableModal] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [newDeliverableDescription, setNewDeliverableDescription] = useState('');
  const [selectedStreamForDeliverable, setSelectedStreamForDeliverable] = useState('');

  // Load streams and deliverables for the current project
  const loadData = useCallback(async () => {
    if (!currentProject?.id) {
      console.log('No current project, clearing data');
      setStreams([]);
      setDeliverables([]);
      return;
    }

    setLoading(true);
    try {
      console.log('Loading data for project:', currentProject.id);

      // Load streams for this project
      const { data: streamsData, error: streamsError } = await supabase
        .from('streams')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: true });

      if (streamsError) {
        console.error('Error loading streams:', streamsError);
        setStreams([]);
      } else {
        console.log('Loaded streams:', streamsData);
        setStreams(streamsData || []);
      }

      // Load deliverables for this project
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: true });

      if (deliverablesError) {
        console.error('Error loading deliverables:', deliverablesError);
        setDeliverables([]);
      } else {
        console.log('Loaded deliverables:', deliverablesData);
        setDeliverables(deliverablesData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setStreams([]);
      setDeliverables([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  // Load data when current project changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create new stream
  const handleCreateStream = async () => {
    if (!newStreamName.trim() || !currentProject?.id) return;

    try {
      const { data, error } = await supabase
        .from('streams')
        .insert({
          name: newStreamName.trim(),
          project_id: currentProject.id,
          color: getRandomColor(),
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating stream:', error);
        return;
      }

      console.log('Created stream:', data);
      setStreams(prev => [...prev, data]);
      setNewStreamName('');
      setShowNewStreamModal(false);
    } catch (error) {
      console.error('Error creating stream:', error);
    }
  };

  // Create new deliverable
  const handleCreateDeliverable = async () => {
    if (!newDeliverableName.trim() || !selectedStreamForDeliverable || !currentProject?.id) return;

    try {
      const { data, error } = await supabase
        .from('deliverables')
        .insert({
          name: newDeliverableName.trim(),
          description: newDeliverableDescription.trim() || null,
          stream_id: selectedStreamForDeliverable,
          project_id: currentProject.id,
          status: 'not_started',
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating deliverable:', error);
        return;
      }

      console.log('Created deliverable:', data);
      setDeliverables(prev => [...prev, data]);
      setNewDeliverableName('');
      setNewDeliverableDescription('');
      setSelectedStreamForDeliverable('');
      setShowNewDeliverableModal(false);
    } catch (error) {
      console.error('Error creating deliverable:', error);
    }
  };

  // Helper function to get random color for streams
  const getRandomColor = () => {
    const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'indigo', 'gray'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Group deliverables by stream
  const deliverablesByStream = streams.reduce((acc, stream) => {
    acc[stream.id] = deliverables.filter(d => d.stream_id === stream.id);
    return acc;
  }, {});

  // Toggle stream collapse
  const toggleStreamCollapse = (streamId) => {
    const newCollapsed = new Set(collapsedStreams);
    if (newCollapsed.has(streamId)) {
      newCollapsed.delete(streamId);
    } else {
      newCollapsed.add(streamId);
    }
    setCollapsedStreams(newCollapsed);
  };

  // Toggle card collapse
  const toggleCardCollapse = (deliverableId) => {
    const newCollapsed = new Set(collapsedCards);
    if (newCollapsed.has(deliverableId)) {
      newCollapsed.delete(deliverableId);
    } else {
      newCollapsed.add(deliverableId);
    }
    setCollapsedCards(newCollapsed);
  };

  if (!currentProject) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Please select a project to view the program board.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="text-blue-600 mr-2">L1</span>
            Program Board
          </h1>
          <p className="text-gray-600">Functional deliverables organized by streams</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowNewStreamModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stream</span>
          </button>
          <button
            onClick={() => setShowNewDeliverableModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deliverable</span>
          </button>
          <ExportButton />
        </div>
      </div>

      {/* Stream Filter */}
      <div className="mb-6">
        <select
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Streams</option>
          {streams.map(stream => (
            <option key={stream.id} value={stream.id}>{stream.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {streams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No streams found for this project. Create your first stream to get started.</p>
            </div>
          ) : (
            streams.map(stream => {
              const streamDeliverables = deliverablesByStream[stream.id] || [];
              const isCollapsed = collapsedStreams.has(stream.id);
              
              return (
                <div key={stream.id} className={`border-2 border-${stream.color}-200 rounded-lg`}>
                  <div className={`bg-${stream.color}-50 p-4 rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleStreamCollapse(stream.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                        <div className={`w-3 h-3 rounded-full bg-${stream.color}-500`}></div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {stream.name} ({streamDeliverables.length})
                        </h3>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="p-4">
                      {streamDeliverables.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <Plus className="w-6 h-6 text-gray-400" />
                          </div>
                          <p>No active deliverables in this stream</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {streamDeliverables.map(deliverable => {
                            const isCardCollapsed = collapsedCards.has(deliverable.id);
                            
                            return (
                              <div key={deliverable.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => toggleCardCollapse(deliverable.id)}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      {isCardCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    <h4 className="font-medium text-gray-900">{deliverable.name}</h4>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      deliverable.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      deliverable.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {deliverable.status?.replace('_', ' ') || 'not started'}
                                    </span>
                                  </div>
                                  <button className="text-gray-400 hover:text-gray-600">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </div>

                                {!isCardCollapsed && deliverable.description && (
                                  <div className="mt-3 text-sm text-gray-600">
                                    {deliverable.description}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* New Stream Modal */}
      {showNewStreamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Create New Stream</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stream Name
              </label>
              <input
                type="text"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter stream name..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCreateStream}
                disabled={!newStreamName.trim()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Stream
              </button>
              <button
                onClick={() => {
                  setShowNewStreamModal(false);
                  setNewStreamName('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Deliverable Modal */}
      {showNewDeliverableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Create New Deliverable</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stream
              </label>
              <select
                value={selectedStreamForDeliverable}
                onChange={(e) => setSelectedStreamForDeliverable(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a stream...</option>
                {streams.map(stream => (
                  <option key={stream.id} value={stream.id}>{stream.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deliverable Name
              </label>
              <input
                type="text"
                value={newDeliverableName}
                onChange={(e) => setNewDeliverableName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter deliverable name..."
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={newDeliverableDescription}
                onChange={(e) => setNewDeliverableDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter description..."
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCreateDeliverable}
                disabled={!newDeliverableName.trim() || !selectedStreamForDeliverable}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Deliverable
              </button>
              <button
                onClick={() => {
                  setShowNewDeliverableModal(false);
                  setNewDeliverableName('');
                  setNewDeliverableDescription('');
                  setSelectedStreamForDeliverable('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
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

export default ProgramBoardLevel;
