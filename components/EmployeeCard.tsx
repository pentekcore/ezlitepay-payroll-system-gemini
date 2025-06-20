
import React from 'react';
import { Employee } from '../types';
import { DEFAULT_PROFILE_PIC, ViewIcon, EditIcon, ArchiveIcon, UnarchiveIcon, DocumentsIcon, QrCodeIcon, AiSparklesIcon } from '../constants';

interface EmployeeCardProps {
  employee: Employee;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onArchiveToggle: (employee: Employee) => void;
  onDocuments: (employee: Employee) => void;
  onQrCode: (employee: Employee) => void;
  onAskAi: (employee: Employee) => void; 
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onView,
  onEdit,
  onArchiveToggle,
  onDocuments,
  onQrCode,
  onAskAi,
}) => {
  const tenure = (startDate: string): string => {
    if (!startDate) return 'N/A';
    const start = new Date(startDate);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years}y ${months}m`;
  };

  const getStatusClass = (status: string, isArchived: boolean) => {
    if (isArchived) return 'bg-slate-100 text-slate-600';
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'on leave': return 'bg-blue-100 text-blue-700';
      case 'resigned':
      case 'terminated':
        return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };


  return (
    <div className="bg-white shadow-card hover:shadow-card-hover rounded-xl p-5 transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="flex items-start mb-4">
          <img
            src={employee.profilePictureUrl || DEFAULT_PROFILE_PIC}
            alt={`${employee.firstName} ${employee.lastName}`}
            className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-brand-accent"
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-brand-primary truncate" title={`${employee.firstName} ${employee.lastName}`}>
              {employee.firstName} {employee.lastName}
            </h3>
            <p className="text-sm text-slate-600 truncate" title={employee.position}>{employee.position}</p>
            <p className={`mt-1 px-2 py-0.5 inline-block rounded-full text-xs font-semibold ${getStatusClass(employee.status, employee.isArchived)}`}>
              {employee.isArchived ? 'Archived' : employee.status}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-700">
          <p><strong className="font-medium text-slate-500">Gender:</strong> {employee.gender || 'N/A'}</p>
          <p><strong className="font-medium text-slate-500">Employee ID:</strong> {employee.employeeId}</p>
          <p><strong className="font-medium text-slate-500">Department:</strong> {employee.department}</p>
          <p><strong className="font-medium text-slate-500">Birth Date:</strong> {new Date(employee.birthDate).toLocaleDateString()}</p>
          <p><strong className="font-medium text-slate-500">Start Date:</strong> {new Date(employee.startDate).toLocaleDateString()}</p>
          <p><strong className="font-medium text-slate-500">Tenure:</strong> {tenure(employee.startDate)}</p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-200 flex space-x-1 justify-end">
        {[
          { action: () => onView(employee), Icon: ViewIcon, title: "View Details", colorClass: "hover:text-blue-500" },
          { action: () => onEdit(employee), Icon: EditIcon, title: "Edit Employee", colorClass: "hover:text-brand-secondary" },
          { action: () => onArchiveToggle(employee), Icon: employee.isArchived ? UnarchiveIcon : ArchiveIcon, title: employee.isArchived ? "Unarchive" : "Archive", colorClass: employee.isArchived ? "hover:text-yellow-500" : "hover:text-red-500" },
          { action: () => onDocuments(employee), Icon: DocumentsIcon, title: "Documents", colorClass: "hover:text-brand-accent" },
          { action: () => onQrCode(employee), Icon: QrCodeIcon, title: "QR Code", colorClass: "hover:text-purple-500" },
          { action: () => onAskAi(employee), Icon: AiSparklesIcon, title: "Ask AI Assistant", colorClass: "hover:text-teal-500" },
        ].map(({action, Icon, title, colorClass}) => (
            <button
                key={title}
                onClick={action}
                className={`p-2 rounded-full text-slate-400 ${colorClass} transition-colors duration-150 focus:bg-slate-100`}
                title={title}
            >
                <Icon />
            </button>
        ))}
      </div>
    </div>
  );
};

export default EmployeeCard;
