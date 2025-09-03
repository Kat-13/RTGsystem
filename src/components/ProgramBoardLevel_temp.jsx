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

export default ProgramBoardLevel;

