
import React, { useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Employee } from '../types';
import QRCodeStyling from 'qr-code-styling';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

// Initialize QR Code styling options
const qrCodeInstance = new QRCodeStyling({
    width: 280,
    height: 280,
    type: 'svg', // Using SVG for better scalability
    image: "https://www.reshot.com/preview-assets/icons/SCM3N29HUF/pay-SCM3N29HUF.svg", // Using the app logo
    dotsOptions: {
        color: "#21314e", // brand-primary
        type: "rounded"
    },
    backgroundOptions: {
        color: "#ffffff", // white background
    },
    imageOptions: {
        crossOrigin: "anonymous",
        margin: 6,
        imageSize: 0.35 // Slightly larger logo
    },
    cornersSquareOptions: {
        color: "#5e9d4d", // brand-secondary (which is green)
        type: "extra-rounded"
    },
    cornersDotOptions: {
        color: "#5e9d4d", // brand-accent (updated to green)
        type: "dot"
    }
});


const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose, employee }) => {
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && employee && qrRef.current) {
        qrCodeInstance.update({ data: employee.employeeId }); // employeeId is good for QR data
        qrRef.current.innerHTML = ''; // Clear previous QR before appending new one
        qrCodeInstance.append(qrRef.current);
    }
  }, [isOpen, employee]);
  
  const handleDownload = () => {
    if (employee) {
        qrCodeInstance.download({ name: `${employee.firstName}_${employee.lastName}_QR`, extension: "png" });
    }
  };

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`QR Code for Attendance`} size="md">
      <div className="flex flex-col items-center text-center py-4">
        <p className="text-xl font-semibold text-brand-primary mb-1">{employee.firstName} {employee.lastName}</p>
        <p className="text-sm text-slate-600 mb-4">Employee ID: {employee.employeeId}</p>
        
        <div ref={qrRef} className="mb-6 p-3 border-2 border-dashed border-slate-300 rounded-xl bg-white inline-block shadow-sm">
          {/* QR code will be dynamically appended here */}
        </div>
        
        <button
          onClick={handleDownload}
          className="btn-secondary w-full sm:w-auto"
        >
          Download QR Code (PNG)
        </button>
        <p className="text-xs text-slate-500 mt-4">This QR code can be used for quick attendance scanning.</p>
      </div>
    </Modal>
  );
};

export default QrCodeModal;
