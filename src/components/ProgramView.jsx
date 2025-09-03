/*
 * ProgramView.jsx - Executive View Component
 * VERSION: v2.1.3 - 2025-08-21 09:45:00 
 * ENHANCEMENTS: Fixed calculation issues, accurate metrics display
 * LAST MODIFIED: 2025-08-21 09:45:00
 */
import React, { useState, useEffect } from 'react';
import { ProjectAwareDataStorage } from '../data/projectManager';
import { RTG_STREAM_COLORS } from '../data/rtgAEDataModel';
import { Download, Mail } from 'lucide-react';

const ProgramView = () => {
  const [streams, setStreams] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [tracks, setTracks] = useState([]);

  // Load data from ProjectAwareDataStorage
  useEffect(() => {
    console.log('🔍 ProgramView v2.1.1 - 2025-08-20 16:30:00 - Enhanced with bulk checklist, user management, vertical collapse');
    loadData();
    
    // Add interval to sync with other components
    const syncInterval = setInterval(() => {
      loadData();
    }, 1000);
    
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

  // Calculate program metrics using active deliverables only (matching L2)
  const calculateMetrics = () => {
    // Only include deliverables from active streams (matching L2 display)
    const activeStreamIds = streams.map(stream => stream.id);
    const activeDeliverables = deliverables.filter(d => activeStreamIds.includes(d.stream_id));
    
    const activeStreams = streams.filter(stream => {
      const streamDeliverables = activeDeliverables.filter(d => d.stream_id === stream.id);
      return streamDeliverables.length > 0;
    });

    const totalTracks = tracks.length;
    
    const completedDeliverables = activeDeliverables.filter(d => d.readiness === 'complete').length;
    const programCompletion = activeDeliverables.length > 0 ? 
      Math.round((completedDeliverables / activeDeliverables.length) * 100) : 0;

    // Calculate slip days from original dates vs TODAY (real-time slip detection)
    const today = new Date();
    const totalSlipDays = activeDeliverables.reduce((sum, d) => {
      // Skip completed deliverables - they don't contribute to current slip
      if (d.readiness === 'complete') return sum;
      
      // Use target_date as the baseline (first date set on card)
      // If no original_date exists, target_date IS the original date
      const originalDate = new Date(d.original_date || d.target_date);
      
      if (d.target_date || d.original_date) {
        // Calculate slip as days past the original planned date
        const slipDays = Math.max(0, Math.ceil((today - originalDate) / (1000 * 60 * 60 * 24)));
        console.log('🔍 Real-time slip days:', slipDays, 'for', d.title, 'original:', originalDate.toDateString(), 'today:', today.toDateString());
        return sum + slipDays;
      }
      return sum;
    }, 0);

    // Calculate total recommits across active deliverables only
    const totalRecommits = activeDeliverables.reduce((sum, d) => sum + (d.recommit_count || 0), 0);
    const avgRecommits = activeDeliverables.length > 0 ? 
      Math.round((totalRecommits / activeDeliverables.length) * 10) / 10 : 0;

    // Calculate planning accuracy based on actual vs target dates, not default scores
    let totalAccuracyScore = 0;
    let deliverablesWithDates = 0;
    
    activeDeliverables.forEach(d => {
      if (d.target_date) {
        deliverablesWithDates++;
        // If deliverable is on time or early, score = 100%
        // If deliverable is late, calculate penalty based on slip days
        if (d.readiness === 'complete') {
          // For completed deliverables, check if they finished on time
          totalAccuracyScore += 100; // Assume completed = successful for now
        } else if (d.target_date) {
          const targetDate = new Date(d.target_date);
          const today = new Date();
          if (targetDate >= today) {
            // Still on time
            totalAccuracyScore += 100;
          } else {
            // Overdue - calculate penalty
            const daysLate = Math.ceil((today - targetDate) / (1000 * 60 * 60 * 24));
            const penalty = Math.min(daysLate * 10, 100); // 10% penalty per day, max 100%
            totalAccuracyScore += Math.max(0, 100 - penalty);
          }
        }
      }
    });

    const avgPlanningAccuracy = deliverablesWithDates > 0 ? 
      Math.round(totalAccuracyScore / deliverablesWithDates) : 0;

    return {
      activeStreams: activeStreams.length,
      executionTracks: activeDeliverables.length,
      programCompletion,
      totalSlipDays,
      totalRecommits,
      avgRecommits,
      avgPlanningAccuracy
    };
  };

  // Calculate health summary to match L2 indicators
  const calculateHealthSummary = () => {
    // Only include deliverables from active streams (matching L2 display)
    const activeStreamIds = streams.map(stream => stream.id);
    const activeDeliverables = deliverables.filter(d => activeStreamIds.includes(d.stream_id));
    
    // Helper function to check if deliverable is overdue
    const isOverdue = (deliverable) => {
      if (!deliverable.target_date || deliverable.readiness === 'complete') return false;
      const targetDate = new Date(deliverable.target_date);
      const today = new Date();
      return targetDate < today;
    };
    
    // Complete: deliverables with readiness === 'complete'
    const complete = activeDeliverables.filter(d => d.readiness === 'complete').length;
    
    // On Track (Planning Successes): deliverables that are NOT failed
    // Planning failures are: either manually recommitted OR overdue
    const planningFailures = activeDeliverables.filter(d => 
      (d.recommit_count && d.recommit_count > 0) || isOverdue(d)
    ).length;
    const onTrack = activeDeliverables.length - planningFailures - complete;
    
    // Late (Planning Failures): deliverables that are recommitted OR overdue
    const late = planningFailures;

    return { complete, onTrack, late };
  };

  // Calculate stream performance
  const calculateStreamPerformance = () => {
    return streams.map(stream => {
      const streamDeliverables = deliverables.filter(d => d.stream_id === stream.id);
      const streamTracks = tracks.filter(track => {
        const deliverable = deliverables.find(d => d.id === track.deliverable_id);
        return deliverable && deliverable.stream_id === stream.id;
      });

      const completed = streamDeliverables.filter(d => d.readiness === 'complete').length;
      const completionRate = streamDeliverables.length > 0 ? 
        Math.round((completed / streamDeliverables.length) * 100) : 0;

      // Calculate slip days from original dates vs TODAY for this stream (real-time)
      const today = new Date();
      const totalSlipDays = streamDeliverables.reduce((sum, d) => {
        // Skip completed deliverables - they don't contribute to current slip
        if (d.readiness === 'complete') return sum;
        
        // Use target_date as the baseline (first date set on card)
        // If no original_date exists, target_date IS the original date
        const originalDate = new Date(d.original_date || d.target_date);
        
        if (d.target_date || d.original_date) {
          // Calculate slip as days past the original planned date
          const slipDays = Math.max(0, Math.ceil((today - originalDate) / (1000 * 60 * 60 * 24)));
          return sum + slipDays;
        }
        return sum;
      }, 0);

      const avgSlipDays = streamDeliverables.length > 0 ? 
        Math.round((totalSlipDays / streamDeliverables.length) * 10) / 10 : 0;

      // Calculate recommit metrics for this stream
      const totalRecommits = streamDeliverables.reduce((sum, d) => sum + (d.recommit_count || 0), 0);
      const avgRecommits = streamDeliverables.length > 0 ? 
        Math.round((totalRecommits / streamDeliverables.length) * 10) / 10 : 0;

      // Helper function to check if deliverable is overdue (real-time)
      const isOverdue = (deliverable) => {
        if (!deliverable.target_date || deliverable.readiness === 'complete') return false;
        const targetDate = new Date(deliverable.target_date);
        const today = new Date();
        return targetDate < today;
      };

      const complete = streamDeliverables.filter(d => d.readiness === 'complete').length;
      
      // On Track: deliverables that are NOT overdue and NOT manually recommitted
      const onTrack = streamDeliverables.filter(d => 
        d.readiness !== 'complete' && !isOverdue(d) && (d.recommit_count || 0) === 0
      ).length;
      
      // Late: deliverables that are overdue OR manually recommitted
      const late = streamDeliverables.filter(d => 
        d.readiness !== 'complete' && (isOverdue(d) || (d.recommit_count || 0) > 0)
      ).length;

      return {
        ...stream,
        deliverableCount: streamDeliverables.length,
        trackCount: streamTracks.length,
        completionRate,
        totalSlipDays,
        avgSlipDays,
        totalRecommits,
        avgRecommits,
        complete,
        onTrack,
        late
      };
    }).filter(stream => stream.deliverableCount > 0); // Only show streams with deliverables
  };

  const metrics = calculateMetrics();
  const healthSummary = calculateHealthSummary();
  const streamPerformance = calculateStreamPerformance();

  // Export functions
  const exportToPDF = () => {
    // Add print-specific styles
    const printStyles = `
      <style>
        @media print {
          body * { visibility: hidden; }
          .executive-dashboard, .executive-dashboard * { visibility: visible; }
          .executive-dashboard { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            background: white !important;
          }
          .no-print { display: none !important; }
          .print-header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
          }
          .metrics-grid { 
            display: grid !important; 
            grid-template-columns: repeat(3, 1fr) !important; 
            gap: 15px !important; 
            margin-bottom: 20px !important;
          }
          .metric-card { 
            border: 1px solid #d1d5db !important; 
            padding: 15px !important; 
            border-radius: 8px !important; 
            text-align: center !important;
            background: white !important;
          }
          .health-summary { 
            margin: 20px 0 !important; 
            text-align: center !important;
          }
          .health-item { 
            display: inline-block !important; 
            margin: 0 20px !important; 
            text-align: center !important;
          }
          .stream-performance { 
            margin-top: 20px !important;
          }
          .stream-card { 
            border: 1px solid #d1d5db !important; 
            margin-bottom: 10px !important; 
            padding: 10px !important; 
            border-radius: 6px !important;
            background: white !important;
          }
        }
      </style>
    `;
    
    // Add styles to head temporarily
    const styleElement = document.createElement('style');
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);
    
    // Trigger print
    window.print();
    
    // Remove styles after print dialog
    setTimeout(() => {
      document.head.removeChild(styleElement);
    }, 1000);
  };

  const exportToEmail = () => {
    const subject = `RTG Executive Dashboard Report - ${new Date().toLocaleDateString()}`;
    const body = `RTG Executive Dashboard Report
Generated: ${new Date().toLocaleDateString()}

KEY METRICS:
• Active Streams: ${metrics.activeStreams}
• Deliverables: ${metrics.executionTracks}
• Program Completion: ${metrics.programCompletion}%
• Total Slip Days: ${metrics.totalSlipDays}
• Avg Recommits per Deliverable: ${metrics.avgRecommits}
• Planning Accuracy: ${metrics.avgPlanningAccuracy}%

PROGRAM HEALTH SUMMARY:
• Complete: ${healthSummary.complete}
• On Track: ${healthSummary.onTrack}
• Late: ${healthSummary.late}

STREAM PERFORMANCE:
${streamPerformance.map(stream => 
  `• ${stream.name}: ${stream.deliverableCount} deliverables, ${stream.completionRate}% complete, ${stream.avgSlipDays} avg slip days`
).join('\n')}

This report was generated from the RTG AE System - FastLynk Software.`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="min-h-screen bg-gray-50/30 executive-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Executive View</h1>
                <p className="text-gray-600">Comprehensive Snapshot</p>
              </div>
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
              <button
                onClick={exportToEmail}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Email Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 metrics-grid">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow metric-card">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  </div>
                  <span className="text-xl font-semibold text-gray-900">{metrics.activeStreams}</span>
                </div>
                <p className="text-gray-500 text-xs font-medium">Active Streams</p>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow metric-card">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-blue-600 rounded-full"></div>
                  </div>
                  <span className="text-xl font-semibold text-gray-900">{metrics.executionTracks}</span>
                </div>
                <p className="text-gray-500 text-xs font-medium">Deliverables</p>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow metric-card">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                    <div className="w-3 h-1.5 bg-green-600 rounded transform rotate-12"></div>
                  </div>
                  <span className="text-xl font-semibold text-green-600">{metrics.programCompletion}%</span>
                </div>
                <p className="text-gray-500 text-xs font-medium">Program Completion</p>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow metric-card">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-red-100 rounded-md flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-red-600 border-t-0 rounded-b"></div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{metrics.totalSlipDays}</span>
                </div>
                <p className="text-gray-600 text-sm">Total Slip Days</p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-orange-600 rounded-full"></div>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">{metrics.avgRecommits}</span>
                </div>
                <p className="text-gray-600 text-sm">Avg Recommits per Deliverable</p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{metrics.avgPlanningAccuracy}%</span>
                </div>
                <p className="text-gray-600 text-sm">Planning Accuracy</p>
              </div>
            </div>

            {/* Program Health Summary */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                <h2 className="text-lg font-semibold text-gray-900">Program Health Summary</h2>
              </div>
              
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">{healthSummary.complete}</div>
                  <div className="text-sm text-gray-600">Complete</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{healthSummary.onTrack}</div>
                  <div className="text-sm text-gray-600">On Track</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">{healthSummary.late}</div>
                  <div className="text-sm text-gray-600">Late</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommit Reasons Analysis */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 mb-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommit Reasons Analysis</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {['Scope Change', 'Dependency Delay', 'Resource Constraint', 'Technical Complexity', 'External Factor'].map(reason => {
                  const reasonCount = deliverables.reduce((count, d) => {
                    if (d.recommit_reasons) {
                      return count + d.recommit_reasons.filter(r => r === reason).length;
                    }
                    return count;
                  }, 0);
                  
                  const totalRecommits = deliverables.reduce((sum, d) => sum + (d.recommit_count || 0), 0);
                  const percentage = totalRecommits > 0 ? Math.round((reasonCount / totalRecommits) * 100) : 0;
                  
                  return (
                    <div key={reason} className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">{reasonCount}</div>
                      <div className="text-sm text-gray-600 mb-2">{reason}</div>
                      <div className="text-xs text-gray-500">{percentage}% of total</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{width: `${percentage}%`}}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {deliverables.reduce((sum, d) => sum + (d.recommit_count || 0), 0) === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-500">No recommits recorded yet</div>
                </div>
              )}
            </div>

            {/* Stream Performance Ranking */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Stream Performance Ranking</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {streamPerformance.map(stream => (
                  <div key={stream.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-blue-600 rounded"></div>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{stream.name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          {stream.trackCount} tracks
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Completion Rate</span>
                        <span className="font-medium">{stream.completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{width: `${stream.completionRate}%`}}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <div className="font-bold text-green-600">{stream.complete}</div>
                        <div className="text-gray-600">Complete</div>
                      </div>
                      <div>
                        <div className="font-bold text-blue-600">{stream.onTrack}</div>
                        <div className="text-gray-600">On Track</div>
                      </div>
                      <div>
                        <div className="font-bold text-red-600">{stream.late}</div>
                        <div className="text-gray-600">Late</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Total Slip Days</span>
                        <span className="font-medium text-red-600">{stream.totalSlipDays}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Recommits</span>
                        <span className="font-medium text-orange-600">{stream.totalRecommits}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
      </div>
    </div>
  );
};

export default ProgramView;

