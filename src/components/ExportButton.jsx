import React, { useState } from 'react'; 
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { exportProjectData } from '../utils/exportUtils';

const ExportButton = ({ streams, deliverables, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format) => {
    setIsExporting(true);
    setIsOpen(false);
    
    try {
      await exportProjectData(streams, deliverables, format);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors duration-200 font-medium"
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export'}
        <ChevronDown className="h-4 w-4 ml-2" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FileText className="h-4 w-4 mr-3 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Export as CSV</div>
                  <div className="text-xs text-gray-500">For Excel, Google Sheets</div>
                </div>
              </button>
              
              <button
                onClick={() => handleExport('excel')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 mr-3 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Export as Excel</div>
                  <div className="text-xs text-gray-500">Native .xlsx format</div>
                </div>
              </button>
            </div>
            
            <div className="border-t border-gray-100 px-4 py-2">
              <div className="text-xs text-gray-500">
                Exports: Streams → Deliverables → Tasks
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;

