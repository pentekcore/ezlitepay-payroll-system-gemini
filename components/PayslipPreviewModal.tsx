import React, { useRef } from 'react';
import { Modal } from './Modal';
import { Payroll, Employee } from '../types';
import { getCompanyInfo } from '../services/firebaseService'; // To get currencySymbol if needed directly
import { APP_LOGO_URL } from '../constants'; // Fallback logo
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PayslipPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: Payroll | null;
  employee: Employee | null;
  companyInfo: { name: string; address: string; logoUrl: string; currency: string; } | null;
}

const PayslipPreviewModal: React.FC<PayslipPreviewModalProps> = ({ isOpen, onClose, payroll, employee, companyInfo }) => {
  const payslipContentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!payslipContentRef.current || !employee || !payroll) {
      alert("Payslip content is not available for download.");
      return;
    }
    
    const element = payslipContentRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true }); // Increased scale for better quality
    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth - 20; // A4 width in mm with 10mm margins on each side
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    
    let position = 10; // Top margin

    if (imgHeight <= pdfHeight - 20) { // If it fits on one page with margins
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    } else { // Handle content that might exceed one page (simple split for now)
        let heightLeft = imgHeight;
        while (heightLeft > 0) {
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, Math.min(heightLeft, pdfHeight - 20));
            heightLeft -= (pdfHeight - 20);
            position = -(heightLeft); // Negative Y for subsequent parts on the same image
            if (heightLeft > 0) {
                pdf.addPage();
                position = 10; // Reset top margin for new page
            }
        }
    }
    pdf.save(`payslip_${employee.employeeId}_${payroll.payPeriodEnd.replace(/-/g, '')}.pdf`);
  };


  if (!payroll || !employee || !companyInfo) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Loading Payslip..." size="xl">
            <div className="p-10 text-center text-slate-500">Loading payslip details...</div>
        </Modal>
    );
  }

  const currency = companyInfo.currency || '$';
  const companyLogo = companyInfo.logoUrl || APP_LOGO_URL;
  const companyContactEmail = `payroll@${(companyInfo.name || "company").toLowerCase().replace(/\s+/g, '').split('.')[0]}.com`;

  const ytdBenefits = (employee.sssDeduction || 0) + (employee.philhealthDeduction || 0) + (employee.hdmfDeduction || 0);
  const ytdActualOtherDeductions = Math.max(0, payroll.deductions - ytdBenefits);


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payslip Preview" size="2xl" 
      footer={
        <button onClick={handleDownloadPdf} className="btn btn-primary">Download PDF</button>
      }
    >
      <div ref={payslipContentRef} className="p-4 bg-white text-sm font-sans text-slate-800" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-1/3">
            {companyLogo && <img src={companyLogo} alt={`${companyInfo.name} Logo`} className="h-16 max-w-full object-contain" />}
          </div>
          <div className="text-right w-2/3">
            <h1 className="text-3xl font-bold text-green-700" style={{color: '#2E7D32'}}>PAYSLIP</h1>
            <p className="text-xs">Pay Period: {new Date(payroll.payPeriodStart+'T00:00:00').toLocaleDateString()} - {new Date(payroll.payPeriodEnd+'T00:00:00').toLocaleDateString()}</p>
            <p className="text-xs">Date Issued: {payroll.payDateIssued ? new Date(payroll.payDateIssued+'T00:00:00').toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        {/* Company Info */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-green-600 mb-1">Company Information</h2>
          <p className="font-bold">{companyInfo.name || 'N/A'}</p>
          <p className="text-xs">{companyInfo.address || 'N/A'}</p>
          <p className="text-xs">Contact: {companyContactEmail}</p>
        </div>
        <hr className="my-3 border-slate-300"/>

        {/* Employee Info */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-green-600 mb-2">Employee Information</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div><strong className="text-slate-600">Name:</strong> {employee.firstName} {employee.lastName}</div>
            <div><strong className="text-slate-600">TIN:</strong> {employee.tinNumber || 'N/A'}</div>
            <div><strong className="text-slate-600">ID:</strong> {employee.employeeId}</div>
            <div><strong className="text-slate-600">SSS:</strong> {employee.sssNumber || 'N/A'}</div>
            <div><strong className="text-slate-600">Position:</strong> {employee.position}</div>
            <div><strong className="text-slate-600">PhilHealth:</strong> {employee.philhealthNumber || 'N/A'}</div>
            <div><strong className="text-slate-600">Type:</strong> {employee.employeeType}</div>
            <div><strong className="text-slate-600">Pag-IBIG:</strong> {employee.pagibigNumber || 'N/A'}</div>
          </div>
        </div>
        <hr className="my-3 border-slate-300"/>

        {/* Earnings & Deductions */}
        <div className="grid grid-cols-2 gap-x-8 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-700 mb-2">Earnings</h3>
            <div className="flex justify-between text-xs mb-1"><span>Standard Pay</span><span>{currency}{payroll.grossPay.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs mb-1"><span>Overtime Pay</span><span>{currency}0.00</span></div> {/* Placeholder */}
            <hr className="my-1 border-slate-200"/>
            <div className="flex justify-between text-xs font-bold mt-1"><span>Total Earnings</span><span>{currency}{payroll.grossPay.toFixed(2)}</span></div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-700 mb-2">Deductions</h3>
            <div className="flex justify-between text-xs mb-1"><span>SSS Contribution</span><span>{currency}{(employee.sssDeduction || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-xs mb-1"><span>Pag-IBIG (HDMF) Contribution</span><span>{currency}{(employee.hdmfDeduction || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-xs mb-1"><span>PhilHealth Contribution</span><span>{currency}{(employee.philhealthDeduction || 0).toFixed(2)}</span></div>
            {/* Add other deductions if available on payroll object and needed */}
            <hr className="my-1 border-slate-200"/>
            <div className="flex justify-between text-xs font-bold mt-1"><span>Total Deductions</span><span>{currency}{payroll.deductions.toFixed(2)}</span></div>
          </div>
        </div>
        
        {/* Net Pay */}
        <hr className="my-3 border-slate-300"/>
        <div className="flex justify-between items-center my-3 px-2 py-1 bg-green-50 rounded">
          <span className="text-base font-bold text-green-700">Net Pay</span>
          <span className="text-lg font-bold text-green-700">{currency}{payroll.netPay.toFixed(2)}</span>
        </div>
        <hr className="my-3 border-slate-300"/>
        
        {/* Year-to-Date Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Year-to-Date Summary ({new Date(payroll.payPeriodEnd+'T00:00:00').getFullYear()})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-2 rounded shadow-sm">
              <p className="text-xs text-slate-500">YTD Earnings</p>
              <p className="font-semibold text-xs">{currency}{payroll.grossPay.toFixed(2)}</p>
            </div>
             <div className="bg-slate-50 p-2 rounded shadow-sm">
              <p className="text-xs text-slate-500">YTD Benefits</p>
              <p className="font-semibold text-xs">{currency}{ytdBenefits.toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 p-2 rounded shadow-sm">
              <p className="text-xs text-slate-500">YTD Deductions</p>
              <p className="font-semibold text-xs">{currency}{ytdActualOtherDeductions.toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 p-2 rounded shadow-sm">
              <p className="text-xs text-slate-500">YTD Net Pay</p>
              <p className="font-semibold text-xs">{currency}{payroll.netPay.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-6 pt-3 border-t border-slate-200">
          <p>This is a computer-generated document.</p>
          <p>{companyInfo.name || 'Your Company Name'} • EST. 2021</p>
        </div>
      </div>
    </Modal>
  );
};

export default PayslipPreviewModal;