import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical, Edit3, Check, X, Calendar, User } from 'lucide-react';
import { ExecutionTrack } from '../data/rtgAEDataModel';
import { ProjectAwareDataStorage } from '../data/projectManager';

const TracksLevel = () => {
  const [tracks, setTracks] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState('all');
  const [selectedDeliverableState, setSelectedDeliverableState] = useState('all');
  const [selectedPerformance, setSelectedPerformance] = useState('all');
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showStreamActionMenu, setShowStreamActionMenu] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  useEffect(() => {
    loadData();
    
    // Add interval to sync with L1 Program Board changes
    const syncInterval = setInterval(() => {
      loadData();
    }, 1000); // Check for changes every second
    
    return () => clearInterval(syncInterval);
  }, []);

  const loadData = () => {
    const loadedTracks = ProjectAwareDataStorage.load('execution_tracks', []);
    const loadedDeliverables = ProjectAwareDataStorage.load('functional_deliverables', []);
    const loadedStreams = ProjectAwareDataStorage.load('streams', []);
    
    setTracks(loadedTracks);
    setDeliverables(loadedDeliverables);
    setStreams(loadedStreams);
  };

  const handleReopenStream = (streamId) => {
    const updatedStreams = streams.map(stream => 
      stream.id === streamId 
        ? { ...stream, status: 'active' }
        : stream
    );
    setStreams(updatedStreams);
    ProjectAwareDataStorage.save('streams', updatedStreams);
    setShowStreamActionMenu(null);
  };

  const handleDeleteStream = (streamId) => {
    const confirmDelete = window.confirm(
      "⚠️ WARNING: This action cannot be undone!\n\n" +
      "Deleting this stream will permanently remove:\n" +
      "• The stream and all its deliverables\n" +
      "• All associated metrics and history\n" +
      "• All execution tracks\n\n" +
      "This data will be completely lost and cannot be recovered.\n\n" +
      "Are you sure you want to proceed?"
    );
    
    if (!confirmDelete) {
      setShowStreamActionMenu(null);
      return;
    }
    
    const updatedStreams = streams.filter(stream => stream.id !== streamId);
    setStreams(updatedStreams);
    ProjectAwareDataStorage.save('streams', updatedStreams);
    
    // Also remove any deliverables associated with this stream
    const updatedDeliverables = deliverables.filter(deliverable => deliverable.stream_id !== streamId);
    setDeliverables(updatedDeliverables);
    ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
    
    setShowStreamActionMenu(null);
  };

  const handleArchiveStream = (streamId) => {
    const streamToArchive = streams.find(s => s.id === streamId);
    const streamDeliverables = deliverables.filter(d => d.stream_id === streamId);
    
    // Check for incomplete deliverables
    const incompleteDeliverables = streamDeliverables.filter(d => d.readiness !== 'complete');
    
    if (incompleteDeliverables.length > 0) {
      alert(`Cannot archive stream "${streamToArchive.name}". \n\nYou have ${incompleteDeliverables.length} incomplete deliverable${incompleteDeliverables.length !== 1 ? 's' : ''}: \n${incompleteDeliverables.map(d => `• ${d.name}`).join('\n')}\n\nPlease complete all deliverables or transfer them to another stream before archiving.`);
      return;
    }
    
    // Create archive entry with timestamp and metrics
    const archiveEntry = {
      id: ProjectAwareDataStorage.generateId(),
      stream: streamToArchive,
      deliverables: streamDeliverables,
      archived_at: new Date().toISOString(),
      archived_by: 'Current User',
      metrics: {
        total_deliverables: streamDeliverables.length,
        completed_deliverables: streamDeliverables.filter(d => d.readiness === 'complete').length,
        total_recommits: streamDeliverables.reduce((sum, d) => sum + (d.recommit_count || 0), 0),
        total_slip_days: streamDeliverables.reduce((sum, d) => {
          if (d.original_date && d.target_date) {
            const originalDate = new Date(d.original_date);
            const currentDate = new Date(d.target_date);
            const slipDays = Math.max(0, Math.ceil((currentDate - originalDate) / (1000 * 60 * 60 * 24)));
            return sum + slipDays;
          }
          return sum;
        }, 0)
      }
    };
    
    // Save to archive storage
    const existingArchive = ProjectAwareDataStorage.load('archived_streams', []);
    existingArchive.push(archiveEntry);
    ProjectAwareDataStorage.save('archived_streams', existingArchive);
    
    // Remove stream and deliverables from active data
    const updatedStreams = streams.filter(stream => stream.id !== streamId);
    const updatedDeliverables = deliverables.filter(deliverable => deliverable.stream_id !== streamId);
    
    setStreams(updatedStreams);
    setDeliverables(updatedDeliverables);
    ProjectAwareDataStorage.save('streams', updatedStreams);
    ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
    
    setShowStreamActionMenu(null);
  };

  const filteredTracks = tracks.filter(track => {
    // Outside tracks should always be included regardless of stream filter
    const matchesStream = track.is_outside_track || selectedStream === 'all' || (() => {
      const deliverable = deliverables.find(d => d.id === track.deliverable_id);
      return deliverable && deliverable.stream_id === selectedStream;
    })();
    
    const matchesDeliverableState = selectedDeliverableState === 'all' || (() => {
      const deliverable = deliverables.find(d => d.id === track.deliverable_id);
      return deliverable && deliverable.readiness === selectedDeliverableState;
    })();
    
    return matchesStream && matchesDeliverableState;
  });

  // Group tracks by stream and include all deliverables
  const tracksByStream = {};
  
  streams.forEach(stream => {
    // Apply stream filter first
    if (selectedStream !== 'all' && selectedStream !== stream.id) {
      return; // Skip this stream if it doesn't match the stream filter
    }
    
    const streamTracks = filteredTracks.filter(track => {
      const deliverable = deliverables.find(d => d.id === track.deliverable_id);
      return deliverable && deliverable.stream_id === stream.id;
    });
    
    // Include deliverables from this stream, applying deliverable state filter
    const streamDeliverables = deliverables.filter(d => {
      if (d.stream_id !== stream.id) return false;
      if (selectedDeliverableState === 'all') return true;
      // Special case: if filtering by 'complete' and stream is completed, show all deliverables
      if (selectedDeliverableState === 'complete' && stream.status === 'complete') return true;
      return d.readiness === selectedDeliverableState;
    });
    
    // Calculate work completion rate for performance filtering using filtered deliverables
    const completedDeliverables = streamDeliverables.filter(d => d.readiness === 'complete').length;
    const workCompletionRate = streamDeliverables.length > 0 ? Math.round((completedDeliverables / streamDeliverables.length) * 100) : 0;
    
    // Apply performance filter
    const matchesPerformance = selectedPerformance === 'all' || 
      (selectedPerformance === 'on_track' && workCompletionRate >= 75) ||
      (selectedPerformance === 'needs_attention' && workCompletionRate < 75);
    
    // Show streams that have deliverables or tracks and match performance filter
    if ((streamTracks.length > 0 || streamDeliverables.length > 0) && matchesPerformance) {
      tracksByStream[stream.id] = {
        stream,
        tracks: streamTracks,
        deliverables: streamDeliverables
      };
    }
  });

  // Group tracks by deliverable
  const tracksByDeliverable = {};
  deliverables.forEach(deliverable => {
    const deliverableTracks = filteredTracks.filter(track => track.deliverable_id === deliverable.id);
    if (deliverableTracks.length > 0) {
      tracksByDeliverable[deliverable.id] = {
        deliverable,
        tracks: deliverableTracks
      };
    }
  });

  const handleCreateTrack = (trackData) => {
    const newTrack = new ExecutionTrack(
      ProjectAwareDataStorage.generateId(),
      trackData.title,
      trackData.description,
      trackData.deliverable_id,
      trackData.vendor,
      trackData.target_date
    );
    
    // Add outside track flag and health status if it's an outside track
    if (trackData.is_outside_track) {
      newTrack.is_outside_track = true;
      newTrack.health = trackData.health;
    }
    
    const updatedTracks = [...tracks, newTrack];
    setTracks(updatedTracks);
    ProjectAwareDataStorage.save('execution_tracks', updatedTracks);
    setShowTrackModal(false);
  };

  const handleEditOutsideTrack = (trackId, updatedData) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, ...updatedData } : track
    );
    setTracks(updatedTracks);
    ProjectAwareDataStorage.save('execution_tracks', updatedTracks);
  };

  const handleDeleteOutsideTrack = (trackId) => {
    const updatedTracks = tracks.filter(track => track.id !== trackId);
    setTracks(updatedTracks);
    ProjectAwareDataStorage.save('execution_tracks', updatedTracks);
  };

  const handleCompleteTrack = (trackId) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId
        ? { ...track, health: 'complete', completed_at: new Date().toISOString() }
        : track
    );
    setTracks(updatedTracks);
    ProjectAwareDataStorage.save('execution_tracks', updatedTracks);
  };

  const handleRecommitTrack = (trackId, newDate) => {
    const updatedTracks = tracks.map(track => {
      if (track.id === trackId) {
        const recommitEntry = {
          old_date: track.target_date,
          new_date: newDate,
          recommit_at: new Date().toISOString()
        };
        return {
          ...track,
          target_date: newDate,
          recommit_count: track.recommit_count + 1,
          recommit_history: [...track.recommit_history, recommitEntry]
        };
      }
      return track;
    });
    setTracks(updatedTracks);
    ProjectAwareDataStorage.save('execution_tracks', updatedTracks);
  };

  const handleRecommitDeliverable = (deliverableId, newDate, reason) => {
    const updatedDeliverables = deliverables.map(deliverable => {
      if (deliverable.id === deliverableId) {
        const recommitEntry = {
          old_date: deliverable.target_date,
          new_date: newDate,
          reason: reason || '',
          recommit_at: new Date().toISOString()
        };
        return {
          ...deliverable,
          target_date: newDate,
          recommit_count: (deliverable.recommit_count || 0) + 1,
          recommit_history: [...(deliverable.recommit_history || []), recommitEntry]
        };
      }
      return deliverable;
    });
    setDeliverables(updatedDeliverables);
    ProjectAwareDataStorage.save('functional_deliverables', updatedDeliverables);
  };

  const handleEditStream = (streamId, newName) => {
    const updatedStreams = streams.map(stream =>
      stream.id === streamId ? { ...stream, name: newName } : stream
    );
    setStreams(updatedStreams);
    ProjectAwareDataStorage.save('streams', updatedStreams);
  };

  const vendors = [...new Set(tracks.map(track => track.vendor))];

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-gray-500/70 mt-2 text-lg">Concurrent execution monitoring</p>
        </div>
        <button
          onClick={() => setShowTrackModal(true)}
          className="px-6 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition duration-200 ease-in-out shadow-lg flex items-center gap-3"
        >
          <Plus className="h-4 w-4" />
          <span className="font-medium">Outside Track</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-3 bg-white rounded-xl shadow-soft mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200"
          >
            <option value="all">All Streams</option>
            {streams.map(stream => (
              <option key={stream.id} value={stream.id}>{stream.name}</option>
            ))}
          </select>
          <select
            value={selectedDeliverableState}
            onChange={(e) => setSelectedDeliverableState(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200"
          >
            <option value="all">All Deliverable States</option>
            <option value="planning">Planning</option>
            <option value="executing">Executing</option>
            <option value="alignment">Alignment</option>
            <option value="blocked">Blocked</option>
            <option value="complete">Complete</option>
          </select>
          <select
            value={selectedPerformance}
            onChange={(e) => setSelectedPerformance(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200"
          >
            <option value="all">All Performance</option>
            <option value="on_track">On Track</option>
            <option value="needs_attention">Needs Attention</option>
          </select>
          <button
            onClick={() => setShowArchiveModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition duration-200 text-sm font-medium"
          >
            View Archive
          </button>
        </div>
      </div>

      {/* Streams by Deliverable Section */}
      {Object.keys(tracksByStream).length > 0 && (
        <div className="mb-12">
          <div className="mb-8">
            <h3 className="text-2xl font-heading font-semibold text-gray-900 tracking-wide mb-3">Streams by Deliverable ({Object.keys(tracksByStream).length})</h3>
          </div>
          
          <div className="space-y-6">
            {Object.values(tracksByStream).map(({ stream, tracks: streamTracks, deliverables: streamDeliverables }) => (
              <StreamTrackGroup
                key={stream.id}
                stream={stream}
                tracks={streamTracks}
                streamDeliverables={streamDeliverables}
                deliverables={deliverables}
                onCompleteTrack={handleCompleteTrack}
                onRecommitTrack={handleRecommitTrack}
                onRecommitDeliverable={handleRecommitDeliverable}
                onEditStream={handleEditStream}
                onReopenStream={handleReopenStream}
                onDeleteStream={handleDeleteStream}
                onArchiveStream={handleArchiveStream}
              />
            ))}
          </div>
        </div>
      )}

      {/* Outside Tracks Section */}
      {filteredTracks.filter(track => track.is_outside_track).length > 0 && (
        <div className="mt-12 pt-8 border-t-2 border-dashed border-gray-300">
          <div className="flex items-center mb-6">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-gray-600 text-sm font-bold">◦</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Outside Tracks</h3>
              <p className="text-sm text-gray-600">Independent items that don't affect program metrics</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTracks.filter(track => track.is_outside_track).map(track => (
              <div key={track.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{track.title}</h4>
                  <OutsideTrackMenu track={track} onEdit={handleEditOutsideTrack} onDelete={handleDeleteOutsideTrack} />
                </div>
                
                {track.description && (
                  <p className="text-sm text-gray-600 mb-3">{track.description}</p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    track.readiness === 'complete' ? 'bg-green-100 text-green-800' :
                    track.readiness === 'executing' ? 'bg-blue-100 text-blue-800' :
                    track.readiness === 'blocked' ? 'bg-red-100 text-red-800' :
                    track.readiness === 'alignment' ? 'bg-purple-100 text-purple-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {track.readiness}
                  </span>
                  
                  <div className="text-gray-500">
                    {track.vendor && <span>{track.vendor}</span>}
                    {track.target_date && (
                      <div className="text-xs">
                        Target: {new Date(track.target_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTrackModal && (
        <TrackModal
          deliverables={deliverables}
          onSave={handleCreateTrack}
          onClose={() => setShowTrackModal(false)}
        />
      )}
      
      {showArchiveModal && (
        <ArchiveModal
          onClose={() => setShowArchiveModal(false)}
        />
      )}
      </div>
    </div>
  );
};

const StreamTrackGroup = ({ stream, tracks, streamDeliverables = [], deliverables, onCompleteTrack, onRecommitTrack, onRecommitDeliverable, onEditStream, onReopenStream, onDeleteStream, onArchiveStream }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stream.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showStreamActionMenu, setShowStreamActionMenu] = useState(false);

  const completedTracks = tracks.filter(track => track.health === 'complete').length;
  const totalTracks = tracks.length;
  const progressPercentage = totalTracks > 0 ? (completedTracks / totalTracks) * 100 : 0;

  // Calculate deliverable stability metrics
  const totalDeliverables = streamDeliverables.length;
  
  // Helper function to check if deliverable is overdue
  const isOverdue = (deliverable) => {
    if (!deliverable.target_date || deliverable.readiness === 'complete') return false;
    const targetDate = new Date(deliverable.target_date);
    const today = new Date();
    return targetDate < today;
  };
  
  // Count planning failures: either manually recommitted OR overdue
  const planningFailures = streamDeliverables.filter(d => 
    (d.recommit_count && d.recommit_count > 0) || isOverdue(d)
  ).length;
  
  const planningSuccesses = totalDeliverables - planningFailures;
  const stabilityRate = totalDeliverables > 0 ? Math.round((planningSuccesses / totalDeliverables) * 100) : 0;
  
  // Calculate work completion metrics
  const completedDeliverables = streamDeliverables.filter(d => d.readiness === 'complete').length;
  const workCompletionRate = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

  const handleSaveEdit = () => {
    if (editName.trim() && onEditStream) {
      onEditStream(stream.id, editName.trim());
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ borderLeft: `4px solid ${stream.color}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
            
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
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{stream.name}</h4>
                <div className="flex items-center space-x-4 mt-1">
                  {stream.status === 'complete' ? (
                    <span className="text-sm text-orange-600 font-medium">
                      (completed with {streamDeliverables.filter(d => d.readiness !== 'complete').length} deliverable{streamDeliverables.filter(d => d.readiness !== 'complete').length !== 1 ? 's' : ''} still open)
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">({streamDeliverables.length} deliverable{streamDeliverables.length !== 1 ? 's' : ''})</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">{totalDeliverables}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">{planningSuccesses}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">{planningFailures}</span>
              </div>
            </div>
            
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${workCompletionRate}%`,
                  backgroundColor: stream.color
                }}
              />
            </div>
            
            <div className="text-sm text-gray-600 min-w-[70px] text-right">
              <div>Work: {workCompletionRate}%</div>
              <div>Planning: {stabilityRate}%</div>
            </div>

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
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <button 
                onClick={() => setShowStreamActionMenu(!showStreamActionMenu)}
                className="text-gray-400 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
              </button>
              {showStreamActionMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                  <button
                    onClick={() => {
                      onReopenStream(stream.id);
                      setShowStreamActionMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Reopen Stream
                  </button>
                  <button
                    onClick={() => {
                      onArchiveStream(stream.id);
                      setShowStreamActionMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Archive Stream
                  </button>
                  <button
                    onClick={() => {
                      onDeleteStream(stream.id);
                      setShowStreamActionMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete Stream
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-6">
          {streamDeliverables.length > 0 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                {streamDeliverables.map(deliverable => {
                  // Calculate slip days if deliverable is overdue
                  const isOverdue = deliverable.target_date && new Date(deliverable.target_date) < new Date() && deliverable.readiness !== 'complete';
                  const slipDays = isOverdue ? Math.ceil((new Date() - new Date(deliverable.target_date)) / (1000 * 60 * 60 * 24)) : 0;
                  
                  return (
                    <DeliverableCard
                      key={deliverable.id}
                      deliverable={deliverable}
                      isOverdue={isOverdue}
                      slipDays={slipDays}
                      onRecommitDeliverable={onRecommitDeliverable}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          {streamDeliverables.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No deliverables in this stream</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DeliverableTrackGroup = ({ deliverable, tracks, streams, onCompleteTrack, onRecommitTrack }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const stream = streams.find(s => s.id === deliverable.stream_id);
  const completedTracks = tracks.filter(track => track.health === 'complete').length;
  const totalTracks = tracks.length;
  const progressPercentage = totalTracks > 0 ? (completedTracks / totalTracks) * 100 : 0;

  const healthCounts = {
    on_track: tracks.filter(track => track.health === 'on_track').length,
    late: tracks.filter(track => track.health === 'late').length,
    complete: tracks.filter(track => track.health === 'complete').length
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <div>
              <h4 className="font-medium text-gray-900">{deliverable.title}</h4>
              <div className="flex items-center space-x-2 mt-1">
                {stream && (
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: stream.color }}
                  >
                    {stream.name}
                  </span>
                )}
                <span className="text-sm text-gray-500">({totalTracks} tracks)</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-green-600">●{healthCounts.on_track}</span>
              <span className="text-red-600">●{healthCounts.late}</span>
              <span className="text-blue-600">●{healthCounts.complete}</span>
            </div>
            
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <span className="text-sm text-gray-500 w-12 text-right">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                deliverable={deliverable}
                onComplete={onCompleteTrack}
                onRecommit={onRecommitTrack}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TrackCard = ({ track, deliverable, onComplete, onRecommit, showDeliverableContext = false }) => {
  const [showRecommitModal, setShowRecommitModal] = useState(false);

  const healthColors = {
    on_track: 'bg-green-100 text-green-800 border-green-200',
    late: 'bg-red-100 text-red-800 border-red-200',
    complete: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const healthLabels = {
    on_track: 'On Track',
    late: 'Late',
    complete: 'Complete'
  };

  const isOverdue = track.target_date && new Date(track.target_date) < new Date() && track.health !== 'complete';
  const slipDays = isOverdue ? Math.ceil((new Date() - new Date(track.target_date)) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className={`bg-white rounded-lg p-4 border-2 ${healthColors[track.health]} shadow-sm`}>
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-medium text-gray-900 flex-1">{track.title}</h5>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${healthColors[track.health]}`}>
          {healthLabels[track.health]}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{track.description}</p>
      
      {showDeliverableContext && deliverable && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {deliverable.title}
          </span>
        </div>
      )}
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span>{track.vendor}</span>
        </div>
        
        {track.target_date && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(track.target_date).toLocaleDateString()}</span>
            {isOverdue && (
              <span className="text-red-600 font-medium">
                ({slipDays} days late)
              </span>
            )}
          </div>
        )}
        
        {track.recommit_count > 0 && (
          <div className="text-xs text-orange-600">
            Re-committed {track.recommit_count} time{track.recommit_count !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      <div className="flex space-x-2 mt-4">
        {track.health !== 'complete' && (
          <>
            <button
              onClick={() => onComplete(track.id)}
              className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Mark Complete
            </button>
            <button
              onClick={() => setShowRecommitModal(true)}
              className="flex-1 px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
            >
              Re-commit
            </button>
          </>
        )}
      </div>
      
      {showRecommitModal && (
        <RecommitModal
          track={track}
          onRecommit={onRecommit}
          onClose={() => setShowRecommitModal(false)}
        />
      )}
    </div>
  );
};

const TrackModal = ({ deliverables, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [readiness, setReadiness] = useState('planning');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSave({
        title: title.trim(),
        description: description.trim(),
        vendor: vendor.trim() || 'Unassigned',
        target_date: targetDate || null,
        health: readiness, // Map readiness to health field
        is_outside_track: true // Mark as outside track
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create Outside Track</h3>
        <p className="text-sm text-gray-600 mb-4">
          Independent items that need attention but don't affect program metrics
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter track title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              placeholder="Describe the outside track..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Readiness Status
            </label>
            <select
              value={readiness}
              onChange={(e) => setReadiness(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="planning">Planning</option>
              <option value="alignment">Alignment</option>
              <option value="executing">Executing</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor/Team
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g., Internal Team, Vendor A..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create Outside Track
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RecommitModal = ({ track, onRecommit, onClose }) => {
  const [newDate, setNewDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newDate) {
      onRecommit(track.id, newDate);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Re-commit Target Date</h3>
        <p className="text-sm text-gray-600 mb-4">
          Update the target date for "{track.title}"
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Target Date
            </label>
            <input
              type="text"
              value={track.target_date ? new Date(track.target_date).toLocaleDateString() : 'Not set'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Target Date *
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
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
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Re-commit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeliverableCard = ({ deliverable, isOverdue, slipDays, onRecommitDeliverable }) => {
  const [showRecommitModal, setShowRecommitModal] = useState(false);

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <h6 className="font-medium text-gray-900 text-sm mb-2">{deliverable.title}</h6>
      
      {/* Status Badge */}
      <div className="mb-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          deliverable.readiness === 'planning' ? 'bg-yellow-100 text-yellow-800' :
          deliverable.readiness === 'ready' ? 'bg-blue-100 text-blue-800' :
          deliverable.readiness === 'complete' ? 'bg-green-100 text-green-800' :
          deliverable.readiness === 'executing' ? 'bg-blue-100 text-blue-800' :
          deliverable.readiness === 'blocked' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {deliverable.readiness}
        </span>
      </div>
      
      {/* Target Date and Slip */}
      {deliverable.target_date && (
        <div className="text-xs text-gray-600 mb-2">
          Target: {new Date(deliverable.target_date).toLocaleDateString()}
          {isOverdue && (
            <span className="text-red-600 font-medium ml-2">
              -{slipDays} days
            </span>
          )}
        </div>
      )}
      
      {/* Owner/Vendor */}
      {deliverable.vendor && (
        <div className="text-xs text-gray-600 mb-2 flex items-center">
          <User className="w-3 h-3 mr-1" />
          {deliverable.vendor}
        </div>
      )}
      
      {/* Recommit History */}
      {deliverable.recommit_count > 0 && (
        <div className="text-xs text-orange-600 mb-3 font-medium">
          Re-committed {deliverable.recommit_count} time{deliverable.recommit_count !== 1 ? 's' : ''}
        </div>
      )}
      
      {/* Bottom Section */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          0 tracks
        </div>
        <button 
          onClick={() => setShowRecommitModal(true)}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium py-1 px-3 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
        >
          Recommit Date
        </button>
      </div>
      
      {showRecommitModal && (
        <DeliverableRecommitModal
          deliverable={deliverable}
          onRecommit={onRecommitDeliverable}
          onClose={() => setShowRecommitModal(false)}
        />
      )}
    </div>
  );
};

const DeliverableRecommitModal = ({ deliverable, onRecommit, onClose }) => {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newDate && reason.trim()) {
      onRecommit(deliverable.id, newDate, reason.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Re-commit Target Date</h3>
        <p className="text-sm text-gray-600 mb-4">
          Update the target date for "{deliverable.title}"
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Target Date
            </label>
            <input
              type="text"
              value={deliverable.target_date ? new Date(deliverable.target_date).toLocaleDateString() : 'Not set'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Target Date *
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Re-commit *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a reason...</option>
              <option value="Scope Change">Scope Change</option>
              <option value="Dependency Delay">Dependency Delay</option>
              <option value="Resource Constraint">Resource Constraint</option>
              <option value="Technical Complexity">Technical Complexity</option>
              <option value="External Factor">External Factor</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Provide additional context if needed..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Re-commit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OutsideTrackMenu = ({ track, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
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
                setShowEditModal(true);
                setShowMenu(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Track
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this track?')) {
                  onDelete(track.id);
                }
                setShowMenu(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Delete Track
            </button>
          </div>
        )}
      </div>
      
      {showEditModal && (
        <OutsideTrackEditModal
          track={track}
          onSave={onEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
};

const OutsideTrackEditModal = ({ track, onSave, onClose }) => {
  const [title, setTitle] = useState(track.title);
  const [description, setDescription] = useState(track.description || '');
  const [health, setHealth] = useState(track.health || 'planning');
  const [vendor, setVendor] = useState(track.vendor || '');
  const [targetDate, setTargetDate] = useState(track.target_date || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(track.id, {
        title: title.trim(),
        description: description.trim(),
        health,
        vendor: vendor.trim(),
        target_date: targetDate
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Outside Track</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter track title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              placeholder="Describe the outside track..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={health}
              onChange={(e) => setHealth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="planning">Planning</option>
              <option value="alignment">Alignment</option>
              <option value="executing">Executing</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor/Team
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g., Internal Team, Vendor A..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Archive Modal Component
const ArchiveModal = ({ onClose }) => {
  const [archivedStreams, setArchivedStreams] = useState([]);

  useEffect(() => {
    const archived = ProjectAwareDataStorage.load('archived_streams', []);
    setArchivedStreams(archived);
  }, []);

  const handleUnarchive = (archiveId) => {
    const archive = archivedStreams.find(a => a.id === archiveId);
    if (!archive) return;

    // Restore stream and deliverables to active data
    const currentStreams = ProjectAwareDataStorage.load('streams', []);
    const currentDeliverables = ProjectAwareDataStorage.load('functional_deliverables', []);

    // Add stream back to active streams
    const restoredStreams = [...currentStreams, archive.stream];
    
    // Add deliverables back to active deliverables
    const restoredDeliverables = [...currentDeliverables, ...archive.deliverables];

    // Save restored data
    ProjectAwareDataStorage.save('streams', restoredStreams);
    ProjectAwareDataStorage.save('functional_deliverables', restoredDeliverables);

    // Remove from archive
    const updatedArchive = archivedStreams.filter(a => a.id !== archiveId);
    setArchivedStreams(updatedArchive);
    ProjectAwareDataStorage.save('archived_streams', updatedArchive);

    // Refresh the page data
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Archived Streams</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            View archived streams and their preserved metrics
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {archivedStreams.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">No archived streams</div>
              <div className="text-sm text-gray-500">Streams you archive will appear here with their metrics preserved</div>
            </div>
          ) : (
            <div className="space-y-4">
              {archivedStreams.map(archive => (
                <div key={archive.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{archive.stream.name}</h3>
                      <div className="text-sm text-gray-500">
                        Archived on {new Date(archive.archived_at).toLocaleDateString()} by {archive.archived_by}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleUnarchive(archive.id)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition duration-200"
                      >
                        Unarchive
                      </button>
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: archive.stream.color }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{archive.metrics.total_deliverables}</div>
                      <div className="text-gray-600">Total Deliverables</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{archive.metrics.completed_deliverables}</div>
                      <div className="text-gray-600">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-orange-600">{archive.metrics.total_recommits}</div>
                      <div className="text-gray-600">Total Recommits</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{archive.metrics.total_slip_days}</div>
                      <div className="text-gray-600">Total Slip Days</div>
                    </div>
                  </div>
                  
                  {archive.deliverables.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-2">Archived Deliverables:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {archive.deliverables.map(deliverable => (
                          <div key={deliverable.id} className="text-sm text-gray-600 flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              deliverable.readiness === 'complete' ? 'bg-green-500' :
                              deliverable.readiness === 'blocked' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`}></span>
                            {deliverable.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TracksLevel;

