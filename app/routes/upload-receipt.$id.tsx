import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, RotateCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Processing phases for detailed status
const PROCESSING_PHASES = {
  UPLOADING: 'Uploading receipt...',
  SCANNING: 'Scanning items...',
  MATCHING: 'Matching products...',
  PROCESSING: 'Processing entries...',
  COMPLETE: 'Processing complete!',
  ERROR: 'An error occurred'
};

const ReceiptProcessingStatus = ({ 
  receiptId, 
  onComplete 
}) => {
  const [status, setStatus] = useState('pending');
  const [phase, setPhase] = useState(PROCESSING_PHASES.UPLOADING);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    let timeoutId;
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/receipts/${receiptId}/status`);
        const data = await response.json();
        
        setStatus(data.status);
        setPhase(data.phase || PROCESSING_PHASES[data.status.toUpperCase()]);
        setProgress(data.progress || calculateProgress(data.status));
        
        if (data.status === 'error') {
          setError(data.error);
          setCanClose(true);
        } else if (data.status === 'completed') {
          setCanClose(true);
          if (onComplete) onComplete(data);
        } else {
          // Continue polling if not complete
          timeoutId = setTimeout(pollStatus, 2000);
        }
      } catch (err) {
        console.error('Error polling status:', err);
        setError('Unable to get status update');
        setCanClose(true);
      }
    };

    pollStatus();
    return () => clearTimeout(timeoutId);
  }, [receiptId, onComplete]);

  const calculateProgress = (status) => {
    switch (status) {
      case 'pending': return 0;
      case 'uploading': return 25;
      case 'processing': return 75;
      case 'completed': return 100;
      case 'error': return 100;
      default: return 50;
    }
  };

  const renderIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-500" />;
      default:
        return (
          <RotateCw className="h-5 w-5 text-blue-500 animate-spin" />
        );
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="relative overflow-hidden">
        <div className={`absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-500 ${status === 'error' ? 'bg-red-500' : ''}`} 
             style={{ width: `${progress}%` }} />
        
        <div className="flex items-start gap-3">
          {renderIcon()}
          <div>
            <AlertTitle>
              {status === 'error' ? 'Processing Error' : 'Processing Receipt'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-sm text-gray-500">{phase}</p>
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
              {status === 'completed' ? (
                <p className="mt-2 text-sm text-green-500">
                  All items have been processed! You can now view the results.
                </p>
              ) : status !== 'error' && (
                <p className="mt-2 text-sm text-gray-500">
                  This may take a few moments. You can safely leave this page - 
                  we'll keep processing in the background.
                </p>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {canClose && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => window.location.href = '/receipts'}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            View All Receipts
          </button>
          {status === 'completed' && (
            <button
              onClick={() => window.location.href = `/receipts/${receiptId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              View Results
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceiptProcessingStatus;
