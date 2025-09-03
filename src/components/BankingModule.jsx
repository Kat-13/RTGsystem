import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, AlertTriangle, CheckCircle, Clock, Building2 } from 'lucide-react'; 

const BankingModule = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  // Initialize with sample banking projects
  useEffect(() => {
    const sampleProjects = [
      {
        id: 'core-upgrade',
        name: 'Core Banking System Upgrade',
        type: 'Infrastructure',
        status: 'in-progress',
        priority: 'high',
        compliance: ['SOX', 'PCI-DSS'],
        stages: [
          { id: 'planning', name: 'Planning & Requirements', status: 'completed', tasks: 8, completed: 8 },
          { id: 'security-review', name: 'Security Review', status: 'in-progress', tasks: 5, completed: 3 },
          { id: 'development', name: 'Development', status: 'pending', tasks: 12, completed: 0 },
          { id: 'testing', name: 'UAT & Testing', status: 'pending', tasks: 6, completed: 0 },
          { id: 'deployment', name: 'Production Deployment', status: 'pending', tasks: 4, completed: 0 }
        ],
        team: ['IT Security', 'Core Banking', 'Compliance'],
        dueDate: '2024-03-15',
        riskLevel: 'medium'
      },
      {
        id: 'kyc-enhancement',
        name: 'KYC Process Enhancement',
        type: 'Compliance',
        status: 'planning',
        priority: 'high',
        compliance: ['BSA/AML', 'CDD'],
        stages: [
          { id: 'requirements', name: 'Regulatory Requirements', status: 'in-progress', tasks: 4, completed: 2 },
          { id: 'process-design', name: 'Process Design', status: 'pending', tasks: 6, completed: 0 },
          { id: 'system-integration', name: 'System Integration', status: 'pending', tasks: 8, completed: 0 },
          { id: 'training', name: 'Staff Training', status: 'pending', tasks: 3, completed: 0 },
          { id: 'rollout', name: 'Phased Rollout', status: 'pending', tasks: 5, completed: 0 }
        ],
        team: ['Compliance', 'Operations', 'IT'],
        dueDate: '2024-02-28',
        riskLevel: 'high'
      },
      {
        id: 'mobile-app',
        name: 'Mobile Banking App V2.0',
        type: 'Customer Experience',
        status: 'in-progress',
        priority: 'medium',
        compliance: ['PCI-DSS', 'GDPR'],
        stages: [
          { id: 'ux-design', name: 'UX/UI Design', status: 'completed', tasks: 6, completed: 6 },
          { id: 'development', name: 'App Development', status: 'in-progress', tasks: 15, completed: 9 },
          { id: 'security-testing', name: 'Security Testing', status: 'in-progress', tasks: 4, completed: 1 },
          { id: 'beta-testing', name: 'Beta Testing', status: 'pending', tasks: 3, completed: 0 },
          { id: 'app-store', name: 'App Store Release', status: 'pending', tasks: 2, completed: 0 }
        ],
        team: ['Digital Banking', 'IT Security', 'Customer Experience'],
        dueDate: '2024-04-01',
        riskLevel: 'low'
      }
    ];
    setProjects(sampleProjects);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'at-risk': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              Banking Project Management
            </h1>
            <p className="text-gray-600 mt-1">Regulatory-compliant project tracking for financial institutions</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-red-600">
                {projects.filter(p => p.priority === 'high').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Due This Month</p>
              <p className="text-2xl font-bold text-yellow-600">2</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects Kanban Board */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Project Pipeline</h2>
          <p className="text-sm text-gray-600">Drag projects between stages to update status</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Planning Column */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Planning</h3>
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {projects.filter(p => p.status === 'planning').length}
                </span>
              </div>
              
              {projects.filter(p => p.status === 'planning').map(project => (
                <div key={project.id} className="bg-white p-4 rounded-lg shadow-sm border mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2">{project.type}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {project.team.length} teams
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {project.dueDate}
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.compliance.map(comp => (
                      <span key={comp} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* In Progress Column */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">In Progress</h3>
                <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs">
                  {projects.filter(p => p.status === 'in-progress').length}
                </span>
              </div>
              
              {projects.filter(p => p.status === 'in-progress').map(project => (
                <div key={project.id} className="bg-white p-4 rounded-lg shadow-sm border mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2">{project.type}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {Math.round((project.stages.reduce((acc, stage) => acc + stage.completed, 0) / 
                                   project.stages.reduce((acc, stage) => acc + stage.tasks, 0)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{
                          width: `${(project.stages.reduce((acc, stage) => acc + stage.completed, 0) / 
                                   project.stages.reduce((acc, stage) => acc + stage.tasks, 0)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {project.team.length} teams
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {project.dueDate}
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {project.compliance.slice(0, 2).map(comp => (
                        <span key={comp} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {comp}
                        </span>
                      ))}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getRiskColor(project.riskLevel)}`}>
                      {project.riskLevel} risk
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Completed Column */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Completed</h3>
                <span className="bg-green-200 text-green-700 px-2 py-1 rounded-full text-xs">
                  0
                </span>
              </div>
              
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No completed projects yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankingModule;

