
import React, { useState, useEffect, ChangeEvent } from 'react';
import { Modal } from './Modal';
import { Employee, EmployeeDocument, AppSettings } from '../types';
import { UploadIcon, DownloadIcon, ViewIcon, DeleteIcon } from '../constants';
import { getEmployeeDocuments, uploadEmployeeDocument, addDocumentMetadata, deleteEmployeeDocument, getAppSettings } from '../services/firebaseService';

interface DocumentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const DocumentManagementModal: React.FC<DocumentManagementModalProps> = ({ isOpen, onClose, employee }) => {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocumentsAndSettings = async () => {
    if (!employee) return;
    setIsLoading(true);
    setError(null);
    try {
      const [docs, settings] = await Promise.all([
        getEmployeeDocuments(employee.employeeId), // Use employeeId for consistency
        getAppSettings()
      ]);
      setDocuments(docs);
      setAppSettings(settings);
      if (settings.documentTypes.length > 0 && !documentType) {
        setDocumentType(settings.documentTypes[0]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load documents or settings.");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen && employee) {
      fetchDocumentsAndSettings();
    } else {
      setDocuments([]);
      // setDocumentType(''); // Optionally reset document type when closing
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employee]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null); // Clear previous file errors
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !employee) {
      setError("Please select a file and document type.");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const filePath = `employee_documents/${employee.employeeId}/${documentType}_${selectedFile.name}`;
      const fileUrl = await uploadEmployeeDocument(selectedFile, filePath);
      
      const newDocument: Omit<EmployeeDocument, 'id' | 'uploadedAt'> = {
        employeeId: employee.employeeId,
        documentType: documentType,
        fileName: selectedFile.name,
        fileUrl: fileUrl,
      };
      await addDocumentMetadata(newDocument);
      
      setSelectedFile(null);
      // setDocumentType(appSettings?.documentTypes[0] || ''); // Reset to default or keep current
      await fetchDocumentsAndSettings(); // Refresh list and potentially settings
    } catch (err) {
      console.error("Error uploading document:", err);
      setError(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: EmployeeDocument) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.fileName}"? This action cannot be undone.`)) return;
    setIsLoading(true); // Use general loading for delete action
    setError(null);
    try {
      // Construct path carefully if it's not stored in doc object itself
      const filePath = `employee_documents/${doc.employeeId}/${doc.documentType}_${doc.fileName}`;
      await deleteEmployeeDocument(doc.id, filePath); 
      await fetchDocumentsAndSettings();
    } catch (err) {
      console.error("Error deleting document:", err);
      setError("Failed to delete document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (fileUrl: string) => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };
  
  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank'; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Documents for ${employee?.firstName} ${employee?.lastName}`} size="xl">
      {error && <p className="my-2 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}
      
      <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
        <h4 className="text-lg font-semibold text-brand-primary mb-3 pb-2 border-b border-slate-300">Upload New Document</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label htmlFor="documentType" className="block text-xs font-medium text-slate-600 mb-0.5">Document Type</label>
            <select
              id="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="input-base mt-0.5 bg-white w-full"
              disabled={isUploading || isLoading || !appSettings?.documentTypes.length}
            >
              {appSettings?.documentTypes.length ? 
                appSettings.documentTypes.map(type => <option key={type} value={type}>{type}</option>) :
                <option>Loading types...</option>
              }
            </select>
          </div>
          <div className="md:col-span-5">
            <label htmlFor="fileUpload" className="block text-xs font-medium text-slate-600 mb-0.5">Select File</label>
            <input
              type="file"
              id="fileUpload"
              onChange={handleFileChange}
              className="input-base mt-0.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-accent file:text-white hover:file:bg-brand-accent-hover file:cursor-pointer w-full"
              disabled={isUploading || isLoading}
            />
             {selectedFile && <p className="text-xs text-slate-500 mt-1 truncate">Selected: {selectedFile.name}</p>}
          </div>
          <div className="md:col-span-3">
            <button
              onClick={handleUpload}
              disabled={isUploading || isLoading || !selectedFile || !documentType}
              className="btn btn-secondary w-full"
            >
              {/* <UploadIcon /> */} {/* Icon removed */}
               <span className="ml-0">{isUploading ? 'Uploading...' : 'Upload Document'}</span> {/* Adjusted margin */}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-brand-primary mb-3 pb-2 border-b border-slate-300">Uploaded Documents</h4>
        {isLoading && documents.length === 0 && <p className="text-slate-500 text-center py-5">Loading documents...</p>}
        {!isLoading && documents.length === 0 && <p className="text-slate-500 text-center py-5">No documents have been uploaded for this employee yet.</p>}
        {documents.length > 0 && (
          <ul className="space-y-2 max-h-80 overflow-y-auto scrollbar-sleek pr-2">
            {documents.map(doc => (
              <li key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="overflow-hidden">
                  <p className="font-medium text-slate-800 text-sm truncate" title={doc.fileName}>{doc.fileName}</p>
                  <p className="text-xs text-slate-500">Type: {doc.documentType} | Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt?.toDate?.() || doc.uploadedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="flex space-x-1 flex-shrink-0 ml-2">
                   <button onClick={() => handlePreview(doc.fileUrl)} title="Preview" className="p-1.5 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-50 disabled:opacity-50" disabled={isLoading}> {/* <ViewIcon/> */} P </button>
                   <button onClick={() => handleDownload(doc.fileUrl, doc.fileName)} title="Download" className="p-1.5 text-slate-500 hover:text-green-600 rounded-full hover:bg-green-50 disabled:opacity-50" disabled={isLoading}> {/* <DownloadIcon/> */} D</button>
                   <button onClick={() => handleDeleteDocument(doc)} title="Delete" className="p-1.5 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50" disabled={isLoading}>{/* <DeleteIcon/> */} X</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default DocumentManagementModal;