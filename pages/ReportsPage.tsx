
import React, { useState } from 'react';
import { generateReport } from '../services/firebaseService';

type ReportType = '' | 'payroll_summary' | 'attendance_overview' | 'leave_balances' | 'employee_masterlist';

const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('');
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      alert("Please select a report type.");
      return;
    }
    setIsLoading(true);
    setReportData(null);
    try {
      const data = await generateReport(selectedReport, dateRange);
      setReportData(data);
    } catch (error) {
      console.error("Error generating report:", error);
      alert(`Failed to generate report. ${error instanceof Error ? error.message : String(error)}`);
    }
    setIsLoading(false);
  };

  const handleExportCsv = () => {
    if (!reportData || reportData.length === 0) {
        alert("No data to export.");
        return;
    }
    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(row => Object.values(row).map(val => `"${String(val === null || val === undefined ? '' : val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportOptions: { value: ReportType; label: string; requiresDateRange: boolean }[] = [
    { value: '', label: 'Select a Report Type', requiresDateRange: false },
    { value: 'payroll_summary', label: 'Payroll Summary', requiresDateRange: true },
    { value: 'attendance_overview', label: 'Attendance Overview', requiresDateRange: true },
    { value: 'leave_balances', label: 'Leave Balances', requiresDateRange: false }, // Typically point-in-time, but can be adapted
    { value: 'employee_masterlist', label: 'Employee Masterlist', requiresDateRange: false },
  ];
  
  const currentReportInfo = reportOptions.find(opt => opt.value === selectedReport);

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-brand-primary mb-6 md:mb-8">Reports</h1>

      <div className="mb-6 md:mb-8 p-5 bg-white shadow-card rounded-xl">
        <h2 className="text-xl font-semibold text-brand-primary mb-4">Generate Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
            <select
              id="reportType"
              value={selectedReport}
              onChange={(e) => {
                setSelectedReport(e.target.value as ReportType);
                setReportData(null); // Clear previous report data
              }}
              className="input-base w-full bg-white"
              aria-label="Select report type"
            >
              {reportOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {currentReportInfo?.requiresDateRange && (
            <>
              <div>
                <label htmlFor="reportStartDate" className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input type="date" id="reportStartDate" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="input-base w-full" aria-label="Report start date"/>
              </div>
              <div>
                <label htmlFor="reportEndDate" className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input type="date" id="reportEndDate" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="input-base w-full" aria-label="Report end date"/>
              </div>
            </>
          )}
          <div className={currentReportInfo?.requiresDateRange ? "lg:col-start-4" : "lg:col-start-2"}> {/* Adjust button position */}
            <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isLoading || !selectedReport}
                className="btn btn-primary w-full"
                aria-label="Generate selected report"
            >
                {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {reportData && reportData.length > 0 && (
        <div className="mb-6 flex justify-end">
            <button type="button" onClick={handleExportCsv} className="btn btn-neutral" aria-label="Export report data as CSV">
                Export as CSV
            </button>
        </div>
      )}
      
      {isLoading && 
        <div className="text-center py-10 text-slate-500 bg-white shadow-card rounded-xl">
            <svg className="animate-spin h-8 w-8 text-brand-accent mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Generating report data...</p>
        </div>
      }
      
      {reportData ? (
        reportData.length > 0 ? (
          <div className="bg-white shadow-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    {Object.keys(reportData[0]).map(header => (
                      <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {reportData.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50/75 transition-colors duration-150">
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{String(value === null || value === undefined ? '-' : value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
           !isLoading && <div className="text-center py-16 text-slate-500 bg-white shadow-card rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xl font-semibold">No Data Available</p>
                <p className="text-sm">No data found for the selected report and criteria.</p>
            </div>
        )
      ) : (
        !isLoading && selectedReport && <div className="text-center text-slate-500 py-10 bg-white shadow-card rounded-xl"><p>Click "Generate Report" to view data.</p></div>
      )}
    </div>
  );
};

export default ReportsPage;
