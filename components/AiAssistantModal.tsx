
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Employee } from '../types';
import { askQuestionAboutEmployee } from '../services/aiService';
import { AiSparklesIcon } from '../constants';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose, employee }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when modal is opened or employee changes
    if (isOpen) {
      setQuestion('');
      setAnswer(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, employee]);

  const handleSubmitQuestion = async () => {
    if (!employee || !question.trim()) {
      setError("Please enter a question.");
      return;
    }

    setIsLoading(true);
    setAnswer(null);
    setError(null);

    try {
      const aiResponse = await askQuestionAboutEmployee(employee, question);
      setAnswer(aiResponse);
    } catch (apiError) {
      console.error("AI Assistant Error:", apiError);
      setError(apiError instanceof Error ? apiError.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuestion('');
    setAnswer(null);
    setError(null);
  }

  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI Assistant for ${employee.firstName} ${employee.lastName}`}
      size="xl"
      footer={
        <>
          <button type="button" onClick={handleClear} className="btn btn-neutral" disabled={isLoading}>
            Clear
          </button>
          <button 
            type="button" 
            onClick={handleSubmitQuestion} 
            className="btn btn-primary" 
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? 'Thinking...' : 'Ask AI'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="text-base font-semibold text-brand-primary mb-1">Employee Context:</h4>
          <p className="text-xs text-slate-600">
            <strong>ID:</strong> {employee.employeeId} | <strong>Position:</strong> {employee.position} | <strong>Department:</strong> {employee.department}
          </p>
        </div>

        <div>
          <label htmlFor="aiQuestion" className="block text-sm font-medium text-slate-700 mb-1">
            Your Question:
          </label>
          <textarea
            id="aiQuestion"
            rows={3}
            className="input-base w-full"
            placeholder={`e.g., "What is ${employee.firstName}'s start date?" or "Summarize their contact details."`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center text-slate-600">
              <svg className="animate-spin h-5 w-5 mr-3 text-brand-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Thinking... Please wait.
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm" role="alert">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {answer && !isLoading && (
          <div>
            <h4 className="text-base font-semibold text-brand-primary mb-2 flex items-center">
              <AiSparklesIcon /> <span className="ml-1.5">AI Response:</span>
            </h4>
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-md text-sm text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto scrollbar-sleek">
              {answer}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AiAssistantModal;