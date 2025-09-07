/*
 * ProgramBoardLevel.jsx - L1 Program Board Component 
 * VERSION: v2.1.4 - Migrated to Supabase
 * ENHANCEMENTS: Uses Supabase backend while maintaining exact same functionality
 * LAST MODIFIED: 2025-01-XX XX:XX:XX
 */
import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit3, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { FunctionalDeliverable, ChecklistItem, Stream, RTG_STREAM_COLORS } from '../data/rtgAEDataModel';
import { SupabaseProjectStorage } from '../data/supabaseService';
import ExportButton from './ExportButton';

const ProgramBoardLevel = ({ currentProject }) => {
  const [deliverables, setDeliverables] = useState([]);
  const [streams, setStreams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStream, setSelectedStream] = useState('all');
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showRecommitModal, setShowRecommitModal] = useState(false);
  const [showStreamCompletionModal, setShowStreamCompletionModal] = useState(false);
  const [streamToComplete, setStreamToComplete] = useState(null);
  const [selectedStreamForDeliverable, setSelectedStreamForDeliverable] = useState(null);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [l0Notes, setL0Notes] = useState([]);
  const [recommitData, setRecommitData] = useState({
    deliverable: null,
    oldDate: null,
    newDate: null,
    reason: '',
    explanation: ''
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProject) {
      SupabaseProjectStorage.setCurrentProject(currentProject.id);
      loadData();
    }
  }, [currentProject]);

  const loadData = async () => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      const [loadedDeliverables, loadedStreams, loadedNotes, loadedUsers] = await Promise.all([
        SupabaseProjectStorage.load('functional_deliverables', []),
        SupabaseProjectStorage.load('streams', getDefaultStreams()),
        SupabaseProjectStorage.load('whiteboard_notes', []),
        SupabaseProjectStorage.loadUsers()
      ]);
      
      setDeliverables(loadedDeliverables);
      setStreams(loadedStreams);
      setUsers(loadedUsers);
      
      // Filter unpromoted L0 notes
      const unpromoted = loadedNotes.filter(note => !note.promoted_to_l1);
      setL0Notes(unpromoted);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStreams = () => [];

  const filteredDeliverables = deliverables.filter(deliverable => {
    const matchesSearch = deliverable.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deliverable.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStream = selectedStream === 'all' || deliverable.stream_id === selectedStream;
    
    return matchesSearch && matchesStream;
  });

  const streamData = streams.map(stream => ({
    ...stream,
    deliverables: filteredDeliverables
      .filter(d => d.stream_id === stream.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  })).filter(stream => {
    // On L1, always hide completed and archived streams
    const status = stream.status || 'active';
    if (status === 'complete' || status === 'archived') {
      return false;
    }
    
    // If a specific stream is selected, only show that stream
    if (selectedStream !== 'all') {
      return stream.id === selectedStream;
    }
    // If "All Streams" is selected, show all active streams
    return true;
  });

  const unassignedDeliverables = filteredDeliverables.filter(d => !d.stream_id);

  const handleCreateDeliverable = async (deliverableData) => {
    try {
      if (editingDeliverable) {
        // Update existing deliverable
        const updatedDeliverables = deliverables.map(d => 
          d.id === editingDeliverable.id 
            ? {
                ...d,
                title: deliverableData.title,
                description: deliverableData.description,
                stream_id: deliverableData.stream_id,
                readiness: deliverableData.readiness,
                target_date: deliverableData.target_date,
                // Set original_date if it's null and target_date is being set
                original_date: d.original_date || (deliverableData.target_date ? deliverableData.target_date : null),
                owner_name: deliverableData.owner_name,
                owner_email: deliverableData.owner_email,
                checklist: deliverableData.checklist || [],
                comments: deliverableData.comments || [],
                dependencies: deliverableData.dependencies || []
              }
            : d
        );
        setDeliverables(updatedDeliverables);
        await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
      } else {
        // Create new deliverable
        const newDeliverable = new FunctionalDeliverable(
          SupabaseProjectStorage.generateId(),
          deliverableData.title,
          deliverableData.description,
          deliverableData.stream_id,
          deliverableData.readiness,
          deliverableData.target_date
        );
        
        // Add additional fields
        newDeliverable.owner_name = deliverableData.owner_name;
        newDeliverable.owner_email = deliverableData.owner_email;
        newDeliverable.checklist = deliverableData.checklist || [];
        newDeliverable.comments = deliverableData.comments || [];
        newDeliverable.dependencies = deliverableData.dependencies || [];
        
        const updatedDeliverables = [...deliverables, newDeliverable];
        setDeliverables(updatedDeliverables);
        await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
      }
      
      setShowDeliverableModal(false);
      setEditingDeliverable(null);
    } catch (error) {
      console.error('Error saving deliverable:', error);
    }
  };

  const handleRequestRecommit = (recommitInfo) => {
    setRecommitData(recommitInfo);
    setShowRecommitModal(true);
  };

  const handleConfirmRecommit = async (updatedRecommitData) => {
    if (updatedRecommitData.deliverable && updatedRecommitData.reason) {
      try {
        // Update the deliverable with the new date and add to audit trail
        const updatedDeliverables = deliverables.map(d => {
          if (d.id === updatedRecommitData.deliverable.id) {
            // Add date change to audit trail
            const dateChange = {
              old_date: updatedRecommitData.oldDate,
              new_date: updatedRecommitData.newDate,
              reason: updatedRecommitData.reason,
              explanation: updatedRecommitData.explanation,
              timestamp: new Date().toISOString(),
              user: 'Current User' // This would come from auth
            };

            // Initialize audit trail fields if they don't exist
            if (!d.original_date) {
              d.original_date = updatedRecommitData.oldDate;
            }
            if (!d.date_history) {
              d.date_history = [];
            }
            if (!d.recommit_reasons) {
              d.recommit_reasons = [];
            }

            // Add to audit trail
            d.date_history.push(dateChange);
            d.recommit_reasons.push(updatedRecommitData.reason);
            d.recommit_count = (d.recommit_count || 0) + 1;

            // Update the target date
            d.target_date = updatedRecommitData.newDate;

            // Recalculate planning accuracy score
            d.planning_accuracy_score = Math.max(0, 100 - (d.recommit_count * 10));

            return d;
          }
          return d;
        });

        setDeliverables(updatedDeliverables);
        await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
        
        // Close the deliverable modal since the date change is complete
        setShowDeliverableModal(false);
        setEditingDeliverable(null);
      } catch (error) {
        console.error('Error updating deliverable:', error);
      }
    }

    setShowRecommitModal(false);
    setRecommitData({
      deliverable: null,
      oldDate: null,
      newDate: null,
      reason: '',
      explanation: ''
    });
  };

  const handleCreateStream = async (streamData) => {
    try {
      console.log('handleCreateStream called with:', streamData);
      const newStream = new Stream(
        SupabaseProjectStorage.generateId(),
        streamData.name,
        streamData.color,
        streamData.description
      );
      
      console.log('Created new Stream object:', newStream);
      
      const updatedStreams = [...streams, newStream];
      setStreams(updatedStreams);
      await SupabaseProjectStorage.save('streams', updatedStreams);
      console.log('Updated streams:', updatedStreams);
      setShowStreamModal(false);
    } catch (error) {
      console.error('Error creating stream:', error);
    }
  };

  const handleEditStream = async (streamId, newName) => {
    try {
      const updatedStreams = streams.map(stream =>
        stream.id === streamId ? { ...stream, name: newName } : stream
      );
      setStreams(updatedStreams);
      await SupabaseProjectStorage.save('streams', updatedStreams);
    } catch (error) {
      console.error('Error updating stream:', error);
    }
  };

  const handleDropDeliverable = async (deliverableId, targetStreamId, insertIndex = null) => {
    const deliverable = deliverables.find(d => d.id === deliverableId);
    if (!deliverable) return;

    const sourceStreamId = deliverable.stream_id;
    
    try {
      if (sourceStreamId === targetStreamId && insertIndex !== null) {
        // Reordering within the same stream
        const streamDeliverables = deliverables.filter(d => d.stream_id === targetStreamId);
        const otherDeliverables = deliverables.filter(d => d.stream_id !== targetStreamId);
        
        // Remove the dragged deliverable from its current position
        const filteredStreamDeliverables = streamDeliverables.filter(d => d.id !== deliverableId);
        
        // Insert at the new position
        filteredStreamDeliverables.splice(insertIndex, 0, deliverable);
        
        // Update the order property for all deliverables in this stream
        const reorderedStreamDeliverables = filteredStreamDeliverables.map((d, index) => ({
          ...d,
          order: index
        }));
        
        const updatedDeliverables = [...otherDeliverables, ...reorderedStreamDeliverables];
        setDeliverables(updatedDeliverables);
        await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
      } else {
        // Moving between streams (existing functionality)
        const updatedDeliverables = deliverables.map(deliverable =>
          deliverable.id === deliverableId
            ? { ...deliverable, stream_id: targetStreamId }
            : deliverable
        );
        setDeliverables(updatedDeliverables);
        await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
      }
    } catch (error) {
      console.error('Error moving deliverable:', error);
    }
  };

  const handleReorderStreams = async (draggedStreamId, targetStreamId) => {
    const draggedIndex = streams.findIndex(s => s.id === draggedStreamId);
    const targetIndex = streams.findIndex(s => s.id === targetStreamId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    try {
      const newStreams = [...streams];
      const [draggedStream] = newStreams.splice(draggedIndex, 1);
      newStreams.splice(targetIndex, 0, draggedStream);
      
      setStreams(newStreams);
      await SupabaseProjectStorage.save('streams', newStreams);
    } catch (error) {
      console.error('Error reordering streams:', error);
    }
  };

  const handleToggleChecklistItem = async (deliverableId, itemId) => {
    try {
      const updatedDeliverables = deliverables.map(deliverable => {
        if (deliverable.id === deliverableId) {
          const updatedChecklist = deliverable.checklist.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                done: !item.done,
                done_at: !item.done ? new Date().toISOString() : null
              };
            }
            return item;
          });
          return { ...deliverable, checklist: updatedChecklist };
        }
        return deliverable;
      });
      
      setDeliverables(updatedDeliverables);
      await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    }
  };

  const handleDeleteDeliverable = async (deliverableId) => {
    try {
      const updatedDeliverables = deliverables.filter(deliverable => deliverable.id !== deliverableId);
      setDeliverables(updatedDeliverables);
      await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
    } catch (error) {
      console.error('Error deleting deliverable:', error);
    }
  };

  const handleUpdateDeliverableReadiness = async (deliverableId, newReadiness) => {
    try {
      const updatedDeliverables = deliverables.map(deliverable =>
        deliverable.id === deliverableId
          ? { ...deliverable, readiness: newReadiness }
          : deliverable
      );
      setDeliverables(updatedDeliverables);
      await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
    } catch (error) {
      console.error('Error updating deliverable readiness:', error);
    }
  };

  const handleDeleteStream = async (streamId) => {
    try {
      console.log('handleDeleteStream called with streamId:', streamId);
      console.log('Current streams:', streams);
      
      // Remove the stream
      const updatedStreams = streams.filter(stream => stream.id !== streamId);
      console.log('Updated streams after filter:', updatedStreams);
      
      setStreams(updatedStreams);
      await SupabaseProjectStorage.save('streams', updatedStreams);
      
      // Also remove any deliverables associated with this stream
      const updatedDeliverables = deliverables.filter(deliverable => deliverable.stream_id !== streamId);
      setDeliverables(updatedDeliverables);
      await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
    } catch (error) {
      console.error('Error deleting stream:', error);
    }
  };

  const handleCompleteStream = (stream) => {
    setStreamToComplete(stream);
    setShowStreamCompletionModal(true);
  };

  const handleConfirmStreamCompletion = async (status) => {
    if (streamToComplete) {
      try {
        const updatedStreams = streams.map(stream => 
          stream.id === streamToComplete.id 
            ? { ...stream, status: status }
            : stream
        );
        setStreams(updatedStreams);
        await SupabaseProjectStorage.save('streams', updatedStreams);
      } catch (error) {
        console.error('Error completing stream:', error);
      }
    }
    setShowStreamCompletionModal(false);
    setStreamToComplete(null);
  };

  const handleEditDeliverable = (deliverable) => {
    setEditingDeliverable(deliverable);
    setSelectedStreamForDeliverable(deliverable.stream_id);
    setShowDeliverableModal(true);
  };

  const handlePromoteFromL0 = async (selectedNoteIds) => {
    try {
      const allNotes = await SupabaseProjectStorage.load('whiteboard_notes', []);
      const selectedNotes = allNotes.filter(note => selectedNoteIds.includes(note.id));
      
      const newDeliverables = selectedNotes.map(note => {
        const deliverable = new FunctionalDeliverable(
          SupabaseProjectStorage.generateId(),
          note.title,
          note.description,
          note.stream,
          'planning'
        );
        deliverable.promoted_from_l0 = note.id;
        return deliverable;
      });
      
      // Mark notes as promoted
      const updatedNotes = allNotes.map(note => {
        if (selectedNoteIds.includes(note.id)) {
          return {
            ...note,
            promoted_to_l1: true,
            promoted_at: new Date().toISOString()
          };
        }
        return note;
      });
      
      const updatedDeliverables = [...deliverables, ...newDeliverables];
      setDeliverables(updatedDeliverables);
      await SupabaseProjectStorage.save('functional_deliverables', updatedDeliverables);
      await SupabaseProjectStorage.save('whiteboard_notes', updatedNotes);
      
      // Ensure users are loaded after promotion to prevent undefined errors
      const currentUsers = await SupabaseProjectStorage.loadUsers();
      setUsers(currentUsers || []);
      
      // Refresh L0 notes
      const unpromoted = updatedNotes.filter(note => !note.promoted_to_l1);
      setL0Notes(unpromoted);
      setShowPromoteModal(false);
    } catch (error) {
      console.error('Error promoting from L0:', error);
    }
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-600">Please select or create a project to view the program board.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading program board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold">L1</span>
            </div>
            Program Board
          </h2>
          <p className="text-gray-600 mt-1">Functional deliverables organized by streams</p>
        </div>
        <div className="flex space-x-3">
          {l0Notes.length > 0 && (
            <button
              onClick={() => setShowPromoteModal(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center space-x-2"
            >
              <span>Promote from L0</span>
            </button>
          )}
          <button
            onClick={() => setShowStreamModal(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Stream</span>
          </button>
          <button
            onClick={() => {
              setSelectedStreamForDeliverable(null);
              setShowDeliverableModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Deliverable</span>
          </button>
          <ExportButton />
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search deliverables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Streams</option>
          {streams.map(stream => (
            <option key={stream.id} value={stream.id}>{stream.name}</option>
          ))}
        </select>
      </div>

      {/* Streams Board */}
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {/* Unassigned Deliverables Column */}
        {unassignedDeliverables.length > 0 && (
          <div className="bg-gray-100 rounded-lg p-4 w-80 flex-shrink-0">
            <h3 className="font-medium text-gray-900 mb-4">Unassigned ({unassignedDeliverables.length})</h3>
            <div className="space-y-3">
              {unassignedDeliverables.map(deliverable => (
                <DeliverableCard
                  key={deliverable.id}
                  deliverable={deliverable}
                  onToggleChecklistItem={handleToggleChecklistItem}
                  onEdit={handleEditDeliverable}
                  onDelete={handleDeleteDeliverable}
                  onUpdateReadiness={handleUpdateDeliverableReadiness}
                  users={users}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stream Columns */}
        {streamData.map(stream => (
          <StreamColumn
            key={stream.id}
            stream={stream}
            onEditStream={handleEditStream}
            onDropDeliverable={handleDropDeliverable}
            onReorderStreams={handleReorderStreams}
            onToggleChecklistItem={handleToggleChecklistItem}
            onEditDeliverable={handleEditDeliverable}
            onAddDeliverable={(streamId) => {
              setSelectedStreamForDeliverable(streamId);
              setShowDeliverableModal(true);
            }}
            onDeleteDeliverable={handleDeleteDeliverable}
            onUpdateDeliverableReadiness={handleUpdateDeliverableReadiness}
            onDeleteStream={handleDeleteStream}
            onCompleteStream={handleCompleteStream}
            users={users}
          />
        ))}
      </div>

      {/* Modals */}
      {showDeliverableModal && (
        <DeliverableModal
          streams={streams}
          selectedStreamId={selectedStreamForDeliverable}
          editingDeliverable={editingDeliverable}
          deliverables={deliverables}
          users={users}
          onSave={handleCreateDeliverable}
          onCreateStream={handleCreateStream}
          onRequestRecommit={handleRequestRecommit}
          onClose={() => {
            setShowDeliverableModal(false);
            setSelectedStreamForDeliverable(null);
            setEditingDeliverable(null);
          }}
        />
      )}

      {showRecommitModal && (
        <RecommitModal
          isOpen={showRecommitModal}
          recommitData={recommitData}
          onConfirm={handleConfirmRecommit}
          onCancel={() => setShowRecommitModal(false)}
        />
      )}

      {showStreamModal && (
        <CreateStreamModal
          onSave={handleCreateStream}
          onClose={() => setShowStreamModal(false)}
        />
      )}

      {showPromoteModal && (
        <PromoteFromL0Modal
          notes={l0Notes}
          onPromote={handlePromoteFromL0}
          onClose={() => setShowPromoteModal(false)}
        />
      )}

      {showStreamCompletionModal && (
        <StreamCompletionModal
          stream={streamToComplete}
          onConfirm={handleConfirmStreamCompletion}
          onCancel={() => {
            setShowStreamCompletionModal(false);
            setStreamToComplete(null);
          }}
        />
      )}
    </div>
  );
};


// StreamColumn Component - Complete from original
const StreamColumn = ({ stream, onEditStream, onDropDeliverable, onReorderStreams, onToggleChecklistItem, onEditDeliverable, onAddDeliverable, onDeleteDeliverable, onUpdateDeliverableReadiness, onDeleteStream, onCompleteStream, users }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stream.name);
  const [showMenu, setShowMenu] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleStreamDragStart = (e) => {
    e.dataTransfer.setData('stream/id', stream.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStreamDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('stream/id')) {
      e.dataTransfer.dropEffect = 'move';
      e.currentTarget.classList.add('border-blue-300', 'bg-blue-50');
    }
  };

  const handleStreamDragLeave = (e) => {
    e.currentTarget.classList.remove('border-blue-300', 'bg-blue-50');
  };

  const handleStreamDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-300', 'bg-blue-50');
    
    const draggedStreamId = e.dataTransfer.getData('stream/id');
    if (draggedStreamId && draggedStreamId !== stream.id && onReorderStreams) {
      onReorderStreams(draggedStreamId, stream.id);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('stream/id')) {
      e.currentTarget.classList.add('bg-teal-50', 'border-teal-300');
    }
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-teal-50', 'border-teal-300');
    setDragOverIndex(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-teal-50', 'border-teal-300');
    
    const deliverableId = e.dataTransfer.getData('text/plain');
    if (deliverableId && onDropDeliverable) {
      onDropDeliverable(deliverableId, stream.id, dragOverIndex);
    }
    setDragOverIndex(null);
  };

  const handleCardDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleCardDrop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    
    const deliverableId = e.dataTransfer.getData('text/plain');
    if (deliverableId && onDropDeliverable) {
      onDropDeliverable(deliverableId, stream.id, index);
    }
    setDragOverIndex(null);
  };

  const handleSaveEdit = () => {
    if (editName.trim() && onEditStream) {
      onEditStream(stream.id, editName.trim());
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  const getCollapsedHeight = () => {
    const baseHeight = 120;
    const statusIndicators = [
      stream.deliverables?.filter(d => d.readiness === 'blocked').length > 0,
      stream.deliverables?.filter(d => d.readiness === 'executing').length > 0,
      stream.deliverables?.filter(d => d.readiness === 'complete').length > 0
    ].filter(Boolean).length;
    
    const indicatorHeight = statusIndicators * 12;
    const expandButtonHeight = 40;
    
    return Math.max(200, baseHeight + indicatorHeight + expandButtonHeight);
  };

  return (
    <div
      className={`bg-gray-50 rounded-lg p-4 flex-shrink-0 border-2 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
      style={{ 
        borderColor: stream.color || '#D1D5DB',
        minHeight: isCollapsed ? `${getCollapsedHeight()}px` : '384px',
        maxHeight: isCollapsed ? `${getCollapsedHeight()}px` : '600px'
      }}
      draggable={stream.id !== null}
      onDragStart={handleStreamDragStart}
      onDragOver={(e) => {
        handleDragOver(e);
        handleStreamDragOver(e);
      }}
      onDragLeave={(e) => {
        handleDragLeave(e);
        handleStreamDragLeave(e);
      }}
      onDrop={(e) => {
        handleDrop(e);
        handleStreamDrop(e);
      }}
    >
      {isCollapsed ? (
        <div className="flex flex-col items-center h-full">
          <div className="pt-2 pb-4">
            <div 
              className="writing-mode-vertical text-sm font-medium text-gray-900 transform rotate-180"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              title={stream.name}
            >
              {stream.name}
            </div>
          </div>
          
          <div
            className="w-3 h-3 rounded-full mb-2"
            style={{ backgroundColor: stream.color }}
          />
          
          <div className="text-xs text-gray-500 mb-2">
            {stream.deliverables?.length || 0}
          </div>
          
          <div className="flex flex-col space-y-1 mb-4">
            {stream.deliverables?.filter(d => d.readiness === 'blocked').length > 0 && (
              <div className="w-2 h-2 bg-red-500 rounded-full" title="Blocked items" />
            )}
            {stream.deliverables?.filter(d => d.readiness === 'executing').length > 0 && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" title="In progress" />
            )}
            {stream.deliverables?.filter(d => d.readiness === 'complete').length > 0 && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Completed items" />
            )}
          </div>
          
          <div className="mt-auto mb-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Expand stream"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 flex-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stream.color }}
              />
              {isEditing ? (
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    onKeyDown={(e) => e.key === 'Escape' && setIsEditing(false)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="text-green-600 hover:text-green-800"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <h3 className="font-medium text-gray-900 flex-1">{stream.name}</h3>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">({stream.deliverables?.length || 0})</span>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Collapse stream"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {onEditStream && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Name
                      </button>
                      <button
                        onClick={() => {
                          onCompleteStream && onCompleteStream(stream);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Complete Stream
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Delete button clicked for stream:', stream.name, 'with id:', stream.id);
                          onDeleteStream && onDeleteStream(stream.id);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Stream
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button 
                className="text-gray-400 hover:text-purple-600"
                onClick={() => onAddDeliverable && onAddDeliverable(stream.id)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto flex-1" style={{ maxHeight: '400px' }}>
            {stream.deliverables?.filter(deliverable => deliverable.readiness !== 'complete').map((deliverable, index) => (
              <div key={deliverable.id}>
                <div
                  className={`h-3 mx-2 transition-all duration-200 rounded-md ${
                    dragOverIndex === index 
                      ? 'bg-gradient-to-r from-purple-200 to-blue-200 border-2 border-dashed border-purple-400 shadow-sm' 
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                  onDragOver={(e) => handleCardDragOver(e, index)}
                  onDrop={(e) => handleCardDrop(e, index)}
                >
                  {dragOverIndex === index && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-xs text-purple-600 font-medium">Drop here</div>
                    </div>
                  )}
                </div>
                <DeliverableCard
                  deliverable={deliverable}
                  onToggleChecklistItem={onToggleChecklistItem}
                  onEdit={onEditDeliverable}
                  onDelete={onDeleteDeliverable}
                  onUpdateReadiness={onUpdateDeliverableReadiness}
                  users={users}
                />
                {index === stream.deliverables.filter(d => d.readiness !== 'complete').length - 1 && (
                  <div
                    className={`h-3 mx-2 mt-2 transition-all duration-200 rounded-md ${
                      dragOverIndex === index + 1 
                        ? 'bg-gradient-to-r from-purple-200 to-blue-200 border-2 border-dashed border-purple-400 shadow-sm' 
                        : 'hover:bg-gray-100 border border-transparent'
                    }`}
                    onDragOver={(e) => handleCardDragOver(e, index + 1)}
                    onDrop={(e) => handleCardDrop(e, index + 1)}
                  >
                    {dragOverIndex === index + 1 && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-xs text-purple-600 font-medium">Drop here</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {(!stream.deliverables || stream.deliverables.filter(d => d.readiness !== 'complete').length === 0) && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 border-2 border-dashed border-gray-400 rounded-full" />
                </div>
                <p className="text-gray-500 text-sm">No active deliverables in this stream</p>
              </div>
            )}
          </div>

          {stream.deliverables?.filter(deliverable => deliverable.readiness === 'complete').length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-300">
              <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Completed ({stream.deliverables.filter(d => d.readiness === 'complete').length})
              </h4>
              <div className="space-y-2">
                {stream.deliverables.filter(deliverable => deliverable.readiness === 'complete').map(deliverable => (
                  <DeliverableCard
                    key={deliverable.id}
                    deliverable={deliverable}
                    onToggleChecklistItem={onToggleChecklistItem}
                    onEdit={onEditDeliverable}
                    onDelete={onDeleteDeliverable}
                    onUpdateReadiness={onUpdateDeliverableReadiness}
                    users={users}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// DeliverableCard Component - Complete from original
const DeliverableCard = ({ deliverable, onToggleChecklistItem, onEdit, onDelete, onUpdateReadiness, users }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', deliverable.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const getReadinessColor = (readiness) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-800 border-gray-300',
      alignment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      executing: 'bg-blue-100 text-blue-800 border-blue-300',
      blocked: 'bg-red-100 text-red-800 border-red-300',
      review: 'bg-purple-100 text-purple-800 border-purple-300',
      complete: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
    return colors[readiness] || colors.planning;
  };

  const assignedUser = users?.find(user => user.id === deliverable.assigned_user);
  const completedItems = deliverable.checklist?.filter(item => item.done).length || 0;
  const totalItems = deliverable.checklist?.length || 0;

  return (
    <div
      className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      draggable
      onDragStart={handleDragStart}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{deliverable.title}</h4>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getReadinessColor(deliverable.readiness)}`}>
              {deliverable.readiness}
            </span>
            {deliverable.target_date && (
              <span className="text-xs text-gray-500">
                {new Date(deliverable.target_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(deliverable);
                  setShowMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(deliverable.id);
                  setShowMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
              <hr className="my-1" />
              <div className="px-3 py-1 text-xs text-gray-500 font-medium">Change Status:</div>
              {['planning', 'alignment', 'ready', 'executing', 'blocked', 'review', 'complete'].map(status => (
                <button
                  key={status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateReadiness && onUpdateReadiness(deliverable.id, status);
                    setShowMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-gray-100 ${
                    deliverable.readiness === status ? 'bg-gray-100 font-medium' : 'text-gray-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{deliverable.description}</p>
          
          {deliverable.checklist && deliverable.checklist.length > 0 && (
            <div className="space-y-2 mb-3">
              {deliverable.checklist.slice(0, 3).map(item => (
                <label 
                  key={item.id} 
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleChecklistItem(deliverable.id, item.id);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${item.done ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                    {item.text}
                  </span>
                </label>
              ))}
              {deliverable.checklist.length > 3 && (
                <p className="text-xs text-gray-500">+{deliverable.checklist.length - 3} more items</p>
              )}
              <div className="text-xs text-gray-500">
                {completedItems}/{totalItems} completed
              </div>
            </div>
          )}
          
          {deliverable.target_date && (
            <div className="text-xs text-gray-500">
              Target: {new Date(deliverable.target_date).toLocaleDateString()}
            </div>
          )}
          
          {assignedUser && (
            <div className="text-xs text-gray-500 mt-1">
              Assigned: {assignedUser.name} ({assignedUser.role})
            </div>
          )}
        </>
      )}

      {!isExpanded && deliverable.checklist && deliverable.checklist.length > 0 && (
        <div className="mt-2 space-y-1">
          {deliverable.checklist.slice(0, 2).map(item => (
            <label 
              key={item.id} 
              className="flex items-center space-x-2 cursor-pointer text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleChecklistItem(deliverable.id, item.id);
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
              />
              <span className={`text-xs ${item.done ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                {item.text.length > 30 ? item.text.substring(0, 30) + '...' : item.text}
              </span>
            </label>
          ))}
          {deliverable.checklist.length > 2 && (
            <div className="text-xs text-gray-500 pl-5">
              +{deliverable.checklist.length - 2} more • {completedItems}/{totalItems} done
            </div>
          )}
        </div>
      )}
      
      {deliverable.dependencies && deliverable.dependencies.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Dependencies {deliverable.dependencies.length}
        </div>
      )}
    </div>
  );
};

// DeliverableModal Component - Complete from original
const DeliverableModal = ({ streams, selectedStreamId, editingDeliverable, onSave, onClose, onCreateStream, onRequestRecommit, deliverables, users }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [streamId, setStreamId] = useState(selectedStreamId || '');
  const [readiness, setReadiness] = useState('planning');
  const [targetDate, setTargetDate] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [checklistInput, setChecklistInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkChecklistInput, setBulkChecklistInput] = useState('');
  const [showNewStreamInput, setShowNewStreamInput] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [dependencies, setDependencies] = useState([]);
  const [editingChecklistItem, setEditingChecklistItem] = useState(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  useEffect(() => {
    if (editingDeliverable) {
      setTitle(editingDeliverable.title || '');
      setDescription(editingDeliverable.description || '');
      setStreamId(editingDeliverable.stream_id || '');
      setReadiness(editingDeliverable.readiness || 'planning');
      setTargetDate(editingDeliverable.target_date || '');
      setOwnerName(editingDeliverable.owner_name || '');
      setOwnerEmail(editingDeliverable.owner_email || '');
      setAssignedUser(editingDeliverable.assigned_user || '');
      setChecklist(editingDeliverable.checklist || []);
      setComments(editingDeliverable.comments || []);
      setDependencies(editingDeliverable.dependencies || []);
    }
  }, [editingDeliverable]);

  const handleTargetDateChange = (newDate) => {
    if (editingDeliverable && editingDeliverable.target_date && editingDeliverable.target_date !== newDate) {
      const recommitInfo = {
        deliverable: editingDeliverable,
        oldDate: editingDeliverable.target_date,
        newDate: newDate,
        reason: '',
        explanation: ''
      };
      
      if (onRequestRecommit) {
        onRequestRecommit(recommitInfo);
      } else {
        setTargetDate(newDate);
      }
    } else {
      setTargetDate(newDate);
    }
  };

  const handleCreateNewStream = () => {
    if (newStreamName.trim()) {
      const newStream = {
        id: SupabaseProjectStorage.generateId(),
        name: newStreamName.trim(),
        color: '#8B5CF6'
      };
      
      if (onCreateStream) {
        onCreateStream(newStream);
      }
      
      setStreamId(newStream.id);
      setShowNewStreamInput(false);
      setNewStreamName('');
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: SupabaseProjectStorage.generateId(),
        text: newComment.trim(),
        timestamp: new Date().toISOString(),
        author: 'Current User'
      };
      setComments([...comments, comment]);
      setNewComment('');
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment.id);
    setEditingCommentText(comment.text);
  };

  const handleSaveCommentEdit = (commentId) => {
    if (editingCommentText.trim()) {
      setComments(comments.map(comment =>
        comment.id === commentId
          ? { ...comment, text: editingCommentText.trim() }
          : comment
      ));
      setEditingComment(null);
      setEditingCommentText('');
    }
  };

  const handleCancelCommentEdit = () => {
    setEditingComment(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = (commentId) => {
    setComments(comments.filter(comment => comment.id !== commentId));
  };

  const handleAddChecklistItem = () => {
    if (checklistInput.trim()) {
      const newItem = new ChecklistItem(
        SupabaseProjectStorage.generateId(),
        checklistInput.trim()
      );
      setChecklist([...checklist, newItem]);
      setChecklistInput('');
    }
  };

  const handleBulkImportChecklist = () => {
    if (bulkChecklistInput.trim()) {
      const lines = bulkChecklistInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          return line
            .replace(/^[-•*]\s*/, '')
            .replace(/^\d+\.\s*/, '')
            .replace(/^\t+/, '')
            .trim();
        })
        .filter(line => line.length > 0);

      const newItems = lines.map(line => new ChecklistItem(
        SupabaseProjectStorage.generateId(),
        line
      ));

      setChecklist([...checklist, ...newItems]);
      setBulkChecklistInput('');
      setShowBulkInput(false);
    }
  };

  const handleRemoveChecklistItem = (itemId) => {
    setChecklist(checklist.filter(item => item.id !== itemId));
  };

  const handleEditChecklistItem = (item) => {
    setEditingChecklistItem(item.id);
    setEditingChecklistText(item.text);
  };

  const handleSaveChecklistEdit = (itemId) => {
    if (editingChecklistText.trim()) {
      setChecklist(checklist.map(item => 
        item.id === itemId 
          ? { ...item, text: editingChecklistText.trim() }
          : item
      ));
    }
    setEditingChecklistItem(null);
    setEditingChecklistText('');
  };

  const handleCancelChecklistEdit = () => {
    setEditingChecklistItem(null);
    setEditingChecklistText('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      if (showNewStreamInput && newStreamName.trim()) {
        const newStream = {
          id: SupabaseProjectStorage.generateId(),
          name: newStreamName.trim(),
          color: '#8B5CF6'
        };
        
        if (onCreateStream) {
          onCreateStream(newStream);
        }
        
        onSave({
          title: title.trim(),
          description: description.trim(),
          stream_id: newStream.id,
          readiness,
          target_date: targetDate || null,
          owner_name: ownerName.trim() || null,
          owner_email: ownerEmail.trim() || null,
          assigned_user: assignedUser || null,
          checklist,
          comments,
          dependencies
        });
      } else {
        onSave({
          title: title.trim(),
          description: description.trim(),
          stream_id: streamId || null,
          readiness,
          target_date: targetDate || null,
          owner_name: ownerName.trim() || null,
          owner_email: ownerEmail.trim() || null,
          assigned_user: assignedUser || null,
          checklist,
          comments,
          dependencies
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-medium text-gray-900">
            {editingDeliverable ? 'Edit Functional Deliverable' : 'Create Functional Deliverable'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter deliverable title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the functional deliverable..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stream
              </label>
              <div className="space-y-2">
                <select
                  value={streamId}
                  onChange={(e) => {
                    if (e.target.value === 'create_new') {
                      setShowNewStreamInput(true);
                      setStreamId('');
                    } else {
                      setStreamId(e.target.value);
                      setShowNewStreamInput(false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select stream...</option>
                  {streams.map(stream => (
                    <option key={stream.id} value={stream.id}>{stream.name}</option>
                  ))}
                  <option value="create_new">+ Create New Stream</option>
                </select>
                
                {showNewStreamInput && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newStreamName}
                      onChange={(e) => setNewStreamName(e.target.value)}
                      placeholder="Enter new stream name..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewStream}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewStreamInput(false);
                        setNewStreamName('');
                      }}
                      className="px-3 py-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Readiness
              </label>
              <select
                value={readiness}
                onChange={(e) => setReadiness(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="planning">Planning</option>
                <option value="alignment">Alignment</option>
                <option value="ready">Ready</option>
                <option value="executing">Executing</option>
                <option value="blocked">Blocked</option>
                <option value="review">Review</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Email
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned User
            </label>
            <select
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select team member...</option>
              {[...users].sort((a, b) => a.name.localeCompare(b.name)).map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Add team members in L0 Whiteboard to assign deliverables.
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => handleTargetDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {editingDeliverable ? 'Update' : 'Create'} Deliverable
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// CreateStreamModal Component
const CreateStreamModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');

  const streamColors = [
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        description: description.trim(),
        color: selectedColor
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Stream</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stream Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter stream name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the stream purpose..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Color
            </label>
            <div className="grid grid-cols-4 gap-3">
              {streamColors.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color.value ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Create Stream
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// PromoteFromL0Modal Component
const PromoteFromL0Modal = ({ notes, onPromote, onClose }) => {
  const [selectedNotes, setSelectedNotes] = useState([]);

  const handleToggleNote = (noteId) => {
    setSelectedNotes(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const handlePromote = () => {
    if (selectedNotes.length > 0) {
      onPromote(selectedNotes);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Promote from L0 Whiteboard</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select notes to promote to functional deliverables. Promoted notes will disappear from L0.
        </p>
        
        <div className="space-y-3 mb-6">
          {notes.map(note => (
            <label key={note.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedNotes.includes(note.id)}
                onChange={() => handleToggleNote(note.id)}
                className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{note.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{note.description}</p>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePromote}
            disabled={selectedNotes.length === 0}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Promote {selectedNotes.length} Note{selectedNotes.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// RecommitModal Component
const RecommitModal = ({ isOpen, recommitData, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');

  const reasonOptions = [
    'Scope Change',
    'Dependency Delay', 
    'Resource Constraint',
    'Technical Complexity',
    'External Factor'
  ];

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setExplanation('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (reason) {
      onConfirm({
        ...recommitData,
        reason,
        explanation
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Date Change</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">You are changing the target date for:</p>
          <p className="font-medium text-gray-900">{recommitData?.deliverable?.title}</p>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Current Date:</p>
              <p className="font-medium">{recommitData?.oldDate ? new Date(recommitData.oldDate).toLocaleDateString() : 'Not set'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">New Date:</p>
              <p className="font-medium text-blue-600">{recommitData?.newDate ? new Date(recommitData.newDate).toLocaleDateString() : 'Not set'}</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Change *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a reason...</option>
            {reasonOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Explanation (Optional)
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Provide additional context for this date change..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Change
          </button>
        </div>
      </div>
    </div>
  );
};

// StreamCompletionModal Component
const StreamCompletionModal = ({ stream, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Complete Stream: {stream?.name}</h3>
        <p className="text-gray-600 mb-6">
          How would you like to handle this completed stream?
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="p-3 border rounded-lg">
            <div className="font-medium text-green-600">Complete</div>
            <div className="text-sm text-gray-600">
              Stream will be hidden from active view but counted in metrics
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="font-medium text-red-600">Archive</div>
            <div className="text-sm text-gray-600">
              Stream will be hidden from active workflow but kept in Executive View metrics + audit trail
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm('complete')}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Complete
          </button>
          <button
            onClick={() => onConfirm('archived')}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramBoardLevel;
