// Export utilities for CSV and Excel generation 
import * as XLSX from 'xlsx';

/**
 * Converts RTG data to hierarchical CSV/Excel format
 * @param {Array} streams - Array of stream objects
 * @param {Array} deliverables - Array of deliverable objects
 * @returns {Array} Array of row objects for export
 */
export const convertToHierarchicalData = (streams, deliverables) => {
  const exportData = [];
  
  // Sort streams by name for consistent output
  const sortedStreams = [...streams].sort((a, b) => a.name.localeCompare(b.name));
  
  sortedStreams.forEach(stream => {
    // Add stream row (Level 1)
    exportData.push({
      Level: 1,
      Type: 'Stream',
      Name: stream.name,
      Status: stream.status || 'Active',
      'Target Date': '',
      Owner: '',
      'Assigned User': '',
      Dependencies: '',
      'Dependency Count': '',
      Description: stream.description || `${stream.name} stream`,
      Color: stream.color || '',
      'Stream ID': stream.id
    });
    
    // Get deliverables for this stream
    const streamDeliverables = deliverables
      .filter(d => d.stream_id === stream.id)
      .sort((a, b) => a.title.localeCompare(b.title));
    
    streamDeliverables.forEach(deliverable => {
      // Add deliverable row (Level 2)
      exportData.push({
        Level: 2,
        Type: 'Deliverable',
        Name: deliverable.title,
        Status: deliverable.readiness || 'planning',
        'Target Date': deliverable.target_date || '',
        Owner: deliverable.owner || '',
        'Assigned User': deliverable.assigned_user || '',
        Dependencies: deliverable.dependencies ? deliverable.dependencies.join(', ') : '',
        'Dependency Count': deliverable.dependencies ? deliverable.dependencies.length : 0,
        Description: deliverable.description || '',
        Color: '',
        'Stream ID': stream.id,
        'Deliverable ID': deliverable.id
      });
      
      // Add tasks/checklist items (Level 3)
      if (deliverable.checklist && deliverable.checklist.length > 0) {
        deliverable.checklist.forEach(task => {
          exportData.push({
            Level: 3,
            Type: 'Task',
            Name: task.text,
            Status: task.completed ? 'Complete' : 'Not Started',
            'Target Date': '',
            Owner: '',
            'Assigned User': '',
            Dependencies: '',
            'Dependency Count': '',
            Description: task.text,
            Color: '',
            'Stream ID': stream.id,
            'Deliverable ID': deliverable.id,
            'Task ID': task.id
          });
        });
      }
    });
  });
  
  return exportData;
};

/**
 * Converts data array to CSV string
 * @param {Array} data - Array of row objects
 * @returns {string} CSV string
 */
export const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
};

/**
 * Downloads CSV file
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Filename for download
 */
export const downloadCSV = (csvContent, filename = 'rtg-export.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Creates and downloads Excel file
 * @param {Array} data - Array of row objects
 * @param {string} filename - Filename for download
 */
export const downloadExcel = (data, filename = 'rtg-export.xlsx') => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths for better readability
  const colWidths = [
    { wch: 8 },  // Level
    { wch: 12 }, // Type
    { wch: 40 }, // Name
    { wch: 12 }, // Status
    { wch: 12 }, // Target Date
    { wch: 15 }, // Owner
    { wch: 15 }, // Assigned User
    { wch: 30 }, // Dependencies
    { wch: 8 },  // Dependency Count
    { wch: 50 }, // Description
    { wch: 10 }, // Color
    { wch: 10 }, // Stream ID
    { wch: 12 }, // Deliverable ID
    { wch: 10 }  // Task ID
  ];
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'RTG Export');
  
  // Download file
  XLSX.writeFile(wb, filename);
};

/**
 * Main export function that handles both CSV and Excel
 * @param {Array} streams - Array of stream objects
 * @param {Array} deliverables - Array of deliverable objects
 * @param {string} format - 'csv' or 'excel'
 * @param {string} filename - Optional custom filename
 */
export const exportProjectData = (streams, deliverables, format = 'csv', filename = null) => {
  try {
    // Convert data to hierarchical format
    const hierarchicalData = convertToHierarchicalData(streams, deliverables);
    
    if (hierarchicalData.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const defaultFilename = `rtg-project-export-${timestamp}`;
    
    if (format === 'excel') {
      downloadExcel(hierarchicalData, filename || `${defaultFilename}.xlsx`);
    } else {
      const csvContent = convertToCSV(hierarchicalData);
      downloadCSV(csvContent, filename || `${defaultFilename}.csv`);
    }
    
    console.log(`Export completed: ${hierarchicalData.length} rows exported`);
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please try again.');
  }
};

