import React, { useState, useEffect } from 'react';
import { ProjectAwareDataStorage } from '../data/projectManager'; 

const ScheduleLevel = () => {
  const [streams, setStreams] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [projectDates, setProjectDates] = useState({
    kickoff: '',
    goLive: '',
    helpdeskHandoff: ''
  });
  const [timeScale, setTimeScale] = useState('monthly'); // monthly, quarterly

  useEffect(() => {
    // Load data once on component mount
    try {
      const loadedStreams = ProjectAwareDataStorage.load('streams', []);
      const loadedDeliverables = ProjectAwareDataStorage.load('functional_deliverables', []);
      const loadedTracks = ProjectAwareDataStorage.load('execution_tracks', []);
      const loadedProjectDates = ProjectAwareDataStorage.load('project_dates', {
        kickoff: '',
        goLive: '',
        helpdeskHandoff: ''
      });
      
      console.log('Loaded streams:', loadedStreams);
      console.log('Loaded deliverables:', loadedDeliverables);
      console.log('Sample deliverable:', loadedDeliverables[0]);
      
      setStreams(loadedStreams);
      setDeliverables(loadedDeliverables);
      setTracks(loadedTracks);
      setProjectDates(loadedProjectDates);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  // Generate timeline based on project dates and time scale
  const generateTimeline = () => {
    const periods = [];
    
    // Determine start and end dates from project dates
    const dates = [projectDates.kickoff, projectDates.goLive, projectDates.helpdeskHandoff]
      .filter(date => date)
      .map(date => new Date(date));
    
    let startDate, endDate;
    
    if (dates.length > 0) {
      startDate = new Date(Math.min(...dates));
      endDate = new Date(Math.max(...dates));
      
      // Add buffer months
      startDate.setMonth(startDate.getMonth() - 1);
      endDate.setMonth(endDate.getMonth() + 2);
    } else {
      // Default to 18 months from now
      startDate = new Date();
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 18);
    }
    
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    if (timeScale === 'quarterly') {
      // Generate quarters
      while (current <= endDate) {
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        const year = current.getFullYear();
        periods.push({
          label: `Q${quarter} ${year.toString().slice(-2)}`,
          date: new Date(current),
          isQuarter: true
        });
        current.setMonth(current.getMonth() + 3);
      }
    } else {
      // Generate months
      while (current <= endDate) {
        periods.push({
          label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          date: new Date(current),
          isQuarter: false
        });
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return periods;
  };

  const timeline = generateTimeline();

  // Get earliest and latest dates for a stream (simple version)
  const getStreamDateRange = (streamId) => {
    const streamDeliverables = deliverables.filter(d => d.stream_id === streamId);
    if (streamDeliverables.length === 0) return { start: null, end: null };
    
    const dates = streamDeliverables
      .map(d => d.target_date ? new Date(d.target_date) : null)
      .filter(date => date !== null);
    
    if (dates.length === 0) return { start: null, end: null };
    
    return {
      start: new Date(Math.min(...dates)),
      end: new Date(Math.max(...dates))
    };
  };

  // Simple bar position calculation
  const getBarPosition = (startDate, endDate) => {
    if (!startDate || !endDate) return { left: 0, width: 0 };
    
    const timelineStart = new Date(2025, 5, 1); // June 2025
    const timelineEnd = new Date(2026, 4, 31); // May 2026
    
    const totalDuration = timelineEnd - timelineStart;
    const startOffset = startDate - timelineStart;
    const duration = endDate - startDate;
    
    const left = Math.max(0, (startOffset / totalDuration) * 100);
    const width = Math.min(100 - left, (duration / totalDuration) * 100);
    
    return { left, width: Math.max(width, 2) }; // Minimum 2% width
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
            <span className="text-purple-600 font-bold text-xs">S</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
        </div>
        <p className="text-gray-600">Timeline view of streams and tracks</p>
      </div>

      {/* Data Summary */}
      <div className="mb-6 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-blue-50 p-4 rounded">
          <div className="font-semibold">Streams</div>
          <div className="text-2xl font-bold text-blue-600">{streams.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <div className="font-semibold">Deliverables</div>
          <div className="text-2xl font-bold text-green-600">{deliverables.length}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <div className="font-semibold">Tracks</div>
          <div className="text-2xl font-bold text-purple-600">{tracks.length}</div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
              <div className="text-sm text-gray-600 mt-1">
                {projectDates.kickoff && (
                  <span>Kickoff: {new Date(projectDates.kickoff).toLocaleDateString()} • </span>
                )}
                {projectDates.goLive && (
                  <span>Go-Live: {new Date(projectDates.goLive).toLocaleDateString()} • </span>
                )}
                {projectDates.helpdeskHandoff && (
                  <span>Handoff: {new Date(projectDates.helpdeskHandoff).toLocaleDateString()}</span>
                )}
                {!projectDates.kickoff && !projectDates.goLive && !projectDates.helpdeskHandoff && (
                  <span className="text-gray-500">Set project dates in L0 Whiteboard to see projected timeline</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">View:</label>
              <select
                value={timeScale}
                onChange={(e) => setTimeScale(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Timeline Header */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <div className="w-48 p-4 border-r border-gray-200">
              <h3 className="font-semibold text-gray-900">Timeline</h3>
            </div>
            <div className="flex-1 overflow-x-auto">
              <div className="flex" style={{ minWidth: `${timeline.length * (timeScale === 'quarterly' ? 120 : 80)}px` }}>
                {timeline.map((period, index) => (
                  <div key={index} className={`${timeScale === 'quarterly' ? 'w-30' : 'w-20'} p-2 text-center border-r border-gray-200 last:border-r-0`}>
                    <div className="text-xs font-medium text-gray-900">{period.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stream Rows */}
        <div className="divide-y divide-gray-100">
          {streams.map((stream, index) => {
            // Fix: Use stream_id instead of stream name
            const streamDeliverables = deliverables.filter(d => d.stream_id === stream.id);
            console.log(`Stream ${stream.name}:`, streamDeliverables.length, 'deliverables');
            
            const { start: startDate, end: endDate } = getStreamDateRange(stream.id);
            const barPosition = getBarPosition(startDate, endDate);
            
            console.log(`${stream.name} dates:`, startDate, endDate, 'position:', barPosition);
            
            return (
              <div key={stream.name} className="p-4">
                <div className="flex">
                  <div className="w-48 border-r border-gray-200 pr-4">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: stream.color }}
                      ></div>
                      <div>
                        <div className="font-medium text-gray-900">{stream.name}</div>
                        <div className="text-xs text-gray-500">{streamDeliverables.length} deliverables</div>
                        {startDate && <div className="text-xs text-gray-400">Start: {startDate.toLocaleDateString()}</div>}
                        {endDate && <div className="text-xs text-gray-400">End: {endDate.toLocaleDateString()}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 pl-4 relative h-8">
                    <div style={{ minWidth: `${timeline.length * 80}px`, position: 'relative', height: '32px' }}>
                      {startDate && endDate && barPosition.width > 0 && (
                        <div
                          className="absolute top-2 h-4 rounded"
                          style={{
                            backgroundColor: stream.color,
                            left: `${barPosition.left}%`,
                            width: `${barPosition.width}%`,
                            opacity: 0.8,
                            minWidth: '20px'
                          }}
                        ></div>
                      )}
                      {(!startDate || !endDate) && (
                        <div className="text-xs text-gray-400 mt-2">No dates available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sample Row */}
        <div className="p-4">
          <div className="flex">
            <div className="w-48 border-r border-gray-200 pr-4">
              <div className="text-sm text-gray-600">Timeline months generated: {timeline.length}</div>
            </div>
            <div className="flex-1 pl-4">
              <div className="text-sm text-gray-500">Next: Add stream rows with data</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleLevel;

