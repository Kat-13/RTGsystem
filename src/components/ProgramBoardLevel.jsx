/*
 * ProgramBoardLevel.jsx - L1 Program Board Component
 * VERSION: v2.1.3 - 2025-08-21 09:45:00
 * ENHANCEMENTS: Fixed StreamColumn errors, user assignment functionality, function name references
 * LAST MODIFIED: 2025-08-21 09:45:00
 */
import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit3, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { FunctionalDeliverable, ChecklistItem, Stream, RTG_STREAM_COLORS } from '../data/rtgAEDataModel';
import { ProjectAwareDataStorage } from '../data/projectManager';
import ExportButton from './ExportButton';

const ProgramBoardLevel = () => {
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedDeliverables = ProjectAwareDataStorage.load('functional_deliverables', []);
    const loadedStreams = ProjectAwareDataStorage.load('streams', getDefaultStreams());
    const loadedNotes = ProjectAwareDataStorage.load('whiteboard_notes', []);
    const loadedUsers = ProjectAwareDataStorage.loadUsers();
    
    setDeliverables(loadedDeliverables);
    setStreams(loadedStreams);
    setUsers(loadedUsers);
    
    // Filter unpromoted L0 notes
    const unpromoted = loadedNotes.filter(note => !note.promoted_to_l1);
    setL0Notes(unpromoted);
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

  const handleCreateDeliverable = (deliverableData) => {
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
      ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
    } else {
      // Create new deliverable
      const newDeliverable = new FunctionalDeliverable(
        ProjectAwareDataStorage.generateId(),
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
      ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
    }
    
    setShowDeliverableModal(false);
    setEditingDeliverable(null);
  };

  const handleRequestRecommit = (recommitInfo) => {
    setRecommitData(recommitInfo);
    setShowRecommitModal(true);
  };

  const handleConfirmRecommit = (updatedRecommitData) => {
    if (updatedRecommitData.deliverable && updatedRecommitData.reason) {
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
      ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
      
      // Close the deliverable modal since the date change is complete
      setShowDeliverableModal(false);
      setEditingDeliverable(null);
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

  const handleCreateStream = (streamData) => {
    console.log('handleCreateStream called with:', streamData);
    const newStream = new Stream(
      ProjectAwareDataStorage.generateId(),
      streamData.name,
      streamData.color,
      streamData.description
    );
    
    console.log('Created new Stream object:', newStream);
    
    const updatedStreams = [...streams, newStream];
    setStreams(updatedStreams);
    ProjectAwareDataStorage.save('streams', updatedStreams);
    console.log('Updated streams:', updatedStreams);
    setShowStreamModal(false);
  };

  const handleEditStream = (streamId, newName) => {
    const updatedStreams = streams.map(stream =>
      stream.id === streamId ? { ...stream, name: newName } : stream
    );
    setStreams(updatedStreams);
    ProjectAwareDataStorage.save('streams', updatedStreams);
  };

  const handleDropDeliverable = (deliverableId, targetStreamId, insertIndex = null) => {
    const deliverable = deliverables.find(d => d.id === deliverableId);
    if (!deliverable) return;

    const sourceStreamId = deliverable.stream_id;
    
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
      ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
    } else {
      // Moving between streams (existing functionality)
      const updatedDeliverables = deliverables.map(deliverable =>
        deliverable.id === deliverableId
          ? { ...deliverable, stream_id: targetStreamId }
          : deliverable
      );
      setDeliverables(updatedDeliverables);
      ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
    }
  };

  const handleReorderStreams = (draggedStreamId, targetStreamId) => {
    const draggedIndex = streams.findIndex(s => s.id === draggedStreamId);
    const targetIndex = streams.findIndex(s => s.id === targetStreamId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newStreams = [...streams];
    const [draggedStream] = newStreams.splice(draggedIndex, 1);
    newStreams.splice(targetIndex, 0, draggedStream);
    
    setStreams(newStreams);
    ProjectAwareDataStorage.save('streams', newStreams);
  };

  const handleToggleChecklistItem = (deliverableId, itemId) => {
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
    ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
  };

  const handleDeleteDeliverable = (deliverableId) => {
    const updatedDeliverables = deliverables.filter(deliverable => deliverable.id !== deliverableId);
    setDeliverables(updatedDeliverables);
    ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
  };

  const handleUpdateDeliverableReadiness = (deliverableId, newReadiness) => {
    const updatedDeliverables = deliverables.map(deliverable =>
      deliverable.id === deliverableId
        ? { ...deliverable, readiness: newReadiness }
        : deliverable
    );
    setDeliverables(updatedDeliverables);
    ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
  };

  const handleDeleteStream = (streamId) => {
    console.log('handleDeleteStream called with streamId:', streamId);
    console.log('Current streams:', streams);
    
    // Remove the stream
    const updatedStreams = streams.filter(stream => stream.id !== streamId);
    console.log('Updated streams after filter:', updatedStreams);
    
    setStreams(updatedStreams);
    ProjectAwareDataStorage.save('streams', updatedStreams);
    
    // Also remove any deliverables associated with this stream
    const updatedDeliverables = deliverables.filter(deliverable => deliverable.stream_id !== streamId);
    setDeliverables(updatedDeliverables);
    ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
  };

  const handleCompleteStream = (stream) => {
    setStreamToComplete(stream);
    setShowStreamCompletionModal(true);
  };

  const handleConfirmStreamCompletion = (status) => {
    if (streamToComplete) {
      const updatedStreams = streams.map(stream => 
        stream.id === streamToComplete.id 
          ? { ...stream, status: status }
          : stream
      );
      setStreams(updatedStreams);
      ProjectAwareDataStorage.save('streams', updatedStreams);
    }
    setShowStreamCompletionModal(false);
    setStreamToComplete(null);
  };

  const handleEditDeliverable = (deliverable) => {
    setEditingDeliverable(deliverable);
    setSelectedStreamForDeliverable(deliverable.stream_id);
    setShowDeliverableModal(true);
  };

  const handlePromoteFromL0 = (selectedNoteIds) => {
    const allNotes = ProjectAwareDataStorage.load('whiteboard_notes', []);
    const selectedNotes = allNotes.filter(note => selectedNoteIds.includes(note.id));
    
    const newDeliverables = selectedNotes.map(note => {
      const deliverable = new FunctionalDeliverable(
        ProjectAwareDataStorage.generateId(),
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
    ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
    ProjectAwareDataStorage.save('whiteboard_notes', updatedNotes);
    
    // Ensure users are loaded after promotion to prevent undefined errors
    const currentUsers = ProjectAwareDataStorage.loadUsers();
    setUsers(currentUsers || []);
    
    // Refresh L0 notes
    const unpromoted = updatedNotes.filter(note => !note.promoted_to_l1);
    setL0Notes(unpromoted);
    setShowPromoteModal(false);
  };

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
            onClick={() => setShowDeliverableModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Deliverable</span>
          </button>
          <ExportButton 
            streams={streams} 
            deliverables={deliverables}
            className="ml-2"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Streams</option>
          {streams.filter(stream => stream.status !== 'complete' && stream.status !== 'archive').map(stream => (
            <option key={stream.id} value={stream.id}>{stream.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {streamData.map(stream => (
          <StreamColumn
            key={stream.id}
            stream={stream}
            onEditStream={handleEditStream}
            onDropDeliverable={handleDropDeliverable}
            onReorderStreams={handleReorderStreams}
            onToggleChecklistItem={handleToggleChecklistItem}
            onEditDeliverable={handleEditDeliverable}
            onDeleteDeliverable={handleDeleteDeliverable}
            onUpdateDeliverableReadiness={handleUpdateDeliverableReadiness}
            onDeleteStream={handleDeleteStream}
            onCompleteStream={handleCompleteStream}
            users={users}
            onAddDeliverable={(streamId) => {
              setSelectedStreamForDeliverable(streamId);
              setShowDeliverableModal(true);
            }}
          />
        ))}
        
        {unassignedDeliverables.length > 0 && (
          <StreamColumn
            stream={{
              id: null,
              name: 'Unassigned',
              color: '#6B7280',
              deliverables: unassignedDeliverables
            }}
            onDropDeliverable={handleDropDeliverable}
            onToggleChecklistItem={handleToggleChecklistItem}
            onEditDeliverable={handleEditDeliverable}
            onDeleteDeliverable={handleDeleteDeliverable}
            onUpdateDeliverableReadiness={handleUpdateDeliverableReadiness}
            users={users}
          />
        )}
      </div>

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
    const baseHeight = 120; // Base height for name, color, count
    const statusIndicators = [
      stream.deliverables?.filter(d => d.readiness === 'blocked').length > 0,
      stream.deliverables?.filter(d => d.readiness === 'executing').length > 0,
      stream.deliverables?.filter(d => d.readiness === 'complete').length > 0
    ].filter(Boolean).length;
    
    const indicatorHeight = statusIndicators * 12; // 12px per indicator
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
        /* Collapsed Vertical View */
        <div className="flex flex-col items-center h-full">
          {/* Vertical Stream Name - Moved to Top */}
          <div className="pt-2 pb-4">
            <div 
              className="writing-mode-vertical text-sm font-medium text-gray-900 transform rotate-180"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              title={stream.name}
            >
              {stream.name}
            </div>
          </div>
          
          {/* Stream Color Indicator */}
          <div
            className="w-3 h-3 rounded-full mb-2"
            style={{ backgroundColor: stream.color }}
          />
          
          {/* Deliverable Count */}
          <div className="text-xs text-gray-500 mb-2">
            {stream.deliverables?.length || 0}
          </div>
          
          {/* Quick Status Indicators */}
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
          
          {/* Expand Button - Moved to Bottom */}
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
        /* Expanded Horizontal View */
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

          {/* Stream Content - Expanded View */}
          {/* Active Deliverables */}
          <div className="space-y-3 overflow-y-auto flex-1" style={{ maxHeight: '400px' }}>
            {stream.deliverables?.filter(deliverable => deliverable.readiness !== 'complete').map((deliverable, index) => (
              <div key={deliverable.id}>
                {/* Enhanced drop zone above each card */}
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
                {/* Enhanced drop zone after the last card */}
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

          {/* Completed Deliverables Section */}
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

const DeliverableCard = ({ deliverable, onToggleChecklistItem, onEdit, onDelete, onUpdateReadiness, users = [] }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Get assigned user details
  const assignedUser = users.find(user => user.id === deliverable.assigned_user);
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', deliverable.id);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const readinessColors = {
    planning: 'bg-yellow-100 text-yellow-800',
    alignment: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    executing: 'bg-blue-100 text-blue-800',
    blocked: 'bg-red-100 text-red-800',
    review: 'bg-orange-100 text-orange-800',
    complete: 'bg-gray-100 text-gray-800'
  };

  const completedItems = deliverable.checklist?.filter(item => item.done).length || 0;
  const totalItems = deliverable.checklist?.length || 0;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onEdit && onEdit(deliverable)}
      className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 flex-1">{deliverable.title}</h4>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${readinessColors[deliverable.readiness]}`}>
            {deliverable.readiness}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title={isExpanded ? "Collapse card" : "Expand card"}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-32">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit && onEdit(deliverable);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete && onDelete(deliverable.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
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
      </div>
            {/* Expanded content - only show when isExpanded is true */}
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

      {/* Collapsed checklist preview - show when not expanded */}
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
  const [activeTab, setActiveTab] = useState('All');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [dependencies, setDependencies] = useState([]);
  const [editingChecklistItem, setEditingChecklistItem] = useState(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Populate form when editing existing deliverable
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

  // Handle target date changes with recommit logic
  const handleTargetDateChange = (newDate) => {
    // If editing existing deliverable and date is changing
    if (editingDeliverable && editingDeliverable.target_date && editingDeliverable.target_date !== newDate) {
      // Trigger recommit modal
      const recommitInfo = {
        deliverable: editingDeliverable,
        oldDate: editingDeliverable.target_date,
        newDate: newDate,
        reason: '',
        explanation: ''
      };
      
      // Pass recommit data to parent component
      if (onRequestRecommit) {
        onRequestRecommit(recommitInfo);
      } else {
        // Fallback: just set the date (for now)
        setTargetDate(newDate);
      }
    } else {
      // New deliverable or no date change
      setTargetDate(newDate);
    }
  };

  const handleCreateNewStream = () => {
    console.log('handleCreateNewStream called!');
    if (newStreamName.trim()) {
      const newStream = {
        id: ProjectAwareDataStorage.generateId(),
        name: newStreamName.trim(),
        color: '#8B5CF6' // Default purple color
      };
      
      console.log('Creating new stream:', newStream);
      
      // Call the parent component's function to add the stream
      if (onCreateStream) {
        console.log('Calling onCreateStream with:', newStream);
        onCreateStream(newStream);
      } else {
        console.log('onCreateStream is not available');
      }
      
      setStreamId(newStream.id);
      setShowNewStreamInput(false);
      setNewStreamName('');
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: ProjectAwareDataStorage.generateId(),
        text: newComment.trim(),
        timestamp: new Date().toISOString(),
        author: 'Current User' // This would come from auth
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
        ProjectAwareDataStorage.generateId(),
        checklistInput.trim()
      );
      setChecklist([...checklist, newItem]);
      setChecklistInput('');
    }
  };

  const handleBulkImportChecklist = () => {
    if (bulkChecklistInput.trim()) {
      // Split by lines and clean up each line
      const lines = bulkChecklistInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          // Remove common prefixes like bullets, numbers, tabs
          return line
            .replace(/^[-•*]\s*/, '') // Remove bullet points
            .replace(/^\d+\.\s*/, '') // Remove numbered lists
            .replace(/^\t+/, '') // Remove tabs
            .trim();
        })
        .filter(line => line.length > 0);

      // Create checklist items for each line
      const newItems = lines.map(line => new ChecklistItem(
        ProjectAwareDataStorage.generateId(),
        line
      ));

      // Add to existing checklist
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
      // If we're creating a new stream, create it first
      if (showNewStreamInput && newStreamName.trim()) {
        const newStream = {
          id: ProjectAwareDataStorage.generateId(),
          name: newStreamName.trim(),
          color: '#8B5CF6'
        };
        
        // Create the stream first
        if (onCreateStream) {
          onCreateStream(newStream);
        }
        
        // Use the new stream ID for the deliverable
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
        // Normal submission
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
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                      Add
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
              <select
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select owner...</option>
                {[...users].sort((a, b) => a.name.localeCompare(b.name)).map(user => (
                  <option key={user.id} value={user.name}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
              {users.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Add team members in L0 Whiteboard to select owner.
                </p>
              )}
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Checklist
            </label>
            
            {/* Bulk Import Toggle */}
            <div className="mb-3 flex space-x-2">
              <button
                type="button"
                onClick={() => setShowBulkInput(!showBulkInput)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  showBulkInput 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {showBulkInput ? 'Single Item' : 'Bulk Import'}
              </button>
              {showBulkInput && (
                <span className="text-xs text-gray-500 self-center">
                  Paste from Excel or list format
                </span>
              )}
            </div>

            {/* Bulk Import Area */}
            {showBulkInput && (
              <div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
                <textarea
                  value={bulkChecklistInput}
                  onChange={(e) => setBulkChecklistInput(e.target.value)}
                  placeholder="Paste your checklist here (one item per line)&#10;Example:&#10;• Review requirements&#10;1. Create wireframes&#10;Test functionality&#10;Deploy to production"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <div className="flex space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={handleBulkImportChecklist}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Import Items
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkChecklistInput('');
                      setShowBulkInput(false);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Checklist Items */}
            {checklist.length > 0 && (
              <div className="space-y-2 mb-4">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                    {editingChecklistItem === item.id ? (
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type="text"
                          value={editingChecklistText}
                          onChange={(e) => setEditingChecklistText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveChecklistEdit(item.id);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              handleCancelChecklistEdit();
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveChecklistEdit(item.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelChecklistEdit}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="checkbox"
                            checked={item.done || false}
                            onChange={() => {
                              const updatedChecklist = checklist.map(checkItem => 
                                checkItem.id === item.id 
                                  ? { ...checkItem, done: !checkItem.done, done_at: !checkItem.done ? new Date().toISOString() : null }
                                  : checkItem
                              );
                              setChecklist(updatedChecklist);
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span 
                            className={`text-sm flex-1 ${item.done ? 'line-through text-gray-500' : 'text-gray-700'}`}
                          >
                            {item.text}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditChecklistItem(item)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit item"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete item"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add New Item - Single Mode */}
            {!showBulkInput && (
              <>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                    placeholder="Add checklist item..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Add Item Button */}
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="mt-3 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </>
            )}
          </div>
          
          {/* Dependencies Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Dependencies
            </label>
            
            {/* Current Dependencies */}
            {dependencies.length > 0 && (
              <div className="space-y-2 mb-4">
                {dependencies.map(depId => {
                  const dependentDeliverable = deliverables?.find(d => d.id === depId);
                  if (!dependentDeliverable) return null;
                  
                  return (
                    <div key={depId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{dependentDeliverable.title}</span>
                        <div className="text-xs text-gray-500">
                          Status: {dependentDeliverable.readiness}
                          {dependentDeliverable.target_date && (
                            <span> • Target: {new Date(dependentDeliverable.target_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDependencies(dependencies.filter(id => id !== depId))}
                        className="ml-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Add Dependency Dropdown */}
            <div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !dependencies.includes(e.target.value)) {
                    setDependencies([...dependencies, e.target.value]);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Add dependency...</option>
                {deliverables?.filter(d => 
                  d.id !== editingDeliverable?.id && // Don't allow self-dependency
                  !dependencies.includes(d.id) // Don't show already selected dependencies
                ).sort((a, b) => a.title.localeCompare(b.title)).map(deliverable => (
                  <option key={deliverable.id} value={deliverable.id}>
                    {deliverable.title} ({deliverable.readiness})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Activity Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Activity
            </label>
            <div className="border border-gray-200 rounded-lg">
              {/* Activity Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
                >
                  Comments
                </button>
              </div>
              
              {/* Activity Content */}
              <div className="p-4">
                <div className="space-y-3">
                  {/* Add Comment */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddComment())}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Comment
                    </button>
                  </div>
                  
                  {/* Comments List */}
                  {comments.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {comments.map(comment => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {new Date(comment.timestamp).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleEditComment(comment)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {editingComment === comment.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveCommentEdit(comment.id);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    handleCancelCommentEdit();
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveCommentEdit(comment.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelCommentEdit}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-700">
                              {comment.text.split(/(\s+)/).map((part, index) => {
                                const urlRegex = /^https?:\/\/[^\s]+$/;
                                if (urlRegex.test(part)) {
                                  return (
                                    <a
                                      key={index}
                                      href={part}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      {part}
                                    </a>
                                  );
                                }
                                return part;
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                  )}
                </div>
              </div>
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
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create/Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateStreamModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(RTG_STREAM_COLORS[0].value);

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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Stream</h3>
        <p className="text-sm text-gray-600 mb-4">Create a new domain/stream for organizing deliverables</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stream Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., OHCA, Security, Infrastructure..."
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
              placeholder="Brief description of this stream..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {RTG_STREAM_COLORS.map(color => (
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
                {note.tags.length > 0 && (
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

// Recommit Modal Component
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
