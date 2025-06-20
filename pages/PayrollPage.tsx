
import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { Payroll, Employee, WorkDayEntry, TimeLog } from '../types';
import { getPayrolls, createPayroll, getEmployees, addSinglePayslip, getTimeLogs, getCompanyInfo } from '../services/supabaseService';
import PayslipPreviewModal from '../components/PayslipPreviewModal'; // Import the new modal

type PayrollTab = 'create' | 'view';

const PayrollPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PayrollTab>('create');
  const [pageError, setPageError] = useState<string | null>(null);
  
  // States for "View Generated Payslips" tab
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [isLoadingView, setIsLoadingView] = useState(true);
  const [isProcessingRun, setIsProcessingRun] = useState(false);
  const [viewPayPeriod, setViewPayPeriod] = useState<{start: string, end: string}>({
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [viewFilters, setViewFilters] = useState<{ employeeId: string; searchTerm: string }>({ employeeId: '', searchTerm: '' });
  const [companyInfoForPayslip, setCompanyInfoForPayslip] = useState<{ name: string; address: string; logoUrl: string; currency: string; } | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedPayrollForPreview, setSelectedPayrollForPreview] = useState<Payroll | null>(null);
  const [selectedEmployeeForPreview, setSelectedEmployeeForPreview] = useState<Employee | null>(null);


  // States for "Create Payslip" tab
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [createPayPeriod, setCreatePayPeriod] = useState<{start: string, end: string}>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [payDateIssued, setPayDateIssued] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workDays, setWorkDays] = useState<WorkDayEntry[]>([]);
  const [isGeneratingWorkDays, setIsGeneratingWorkDays] = useState(false);
  const [isSavingPayslip, setIsSavingPayslip] = useState(false);
  const [additionalEarnings, setAdditionalEarnings] = useState({
    adjustments: 0, bonuses: 0, thirteenthMonthPay: 0, otherEarnings: 0
  });
  const [standardDeductions, setStandardDeductions] = useState({
    valeCashAdvance: 0, loanPayments: 0, sssDeduction: 0, philhealthDeduction: 0, hdmfDeduction: 0
  });
  const [payslipSummary, setPayslipSummary] = useState<{gross: number, totalDeductions: number, net: number} | null>(null);

  const fetchEmployeesAndCompanyInfo = useCallback(async () => {
    setPageError(null);
    try {
      const [emps, compInfo] = await Promise.all([
        getEmployees(),
        getCompanyInfo()
      ]);
      setEmployees(emps.filter(e => !e.isArchived));
      setCompanyInfoForPayslip(compInfo);
    } catch (error) {
      console.error("Error fetching employees or company info:", error);
      setPageError("Could not load initial data for payroll. Please check your connection and try refreshing.");
    }
  }, []);
  
  const fetchPayrollsForView = useCallback(async () => {
    setIsLoadingView(true);
    setPageError(null);
    try {
      const fetchedPayrolls = await getPayrolls({ payPeriodStart: viewPayPeriod.start, payPeriodEnd: viewPayPeriod.end });
      setPayrolls(fetchedPayrolls);
    } catch (error) {
      console.error("Error fetching payrolls for view:", error);
      setPageError("Failed to load payroll records. Please check your connection or try different filters.");
    } finally {
      setIsLoadingView(false);
    }
  }, [viewPayPeriod]);

  useEffect(() => {
    // Fetch common data needed for both tabs
    fetchEmployeesAndCompanyInfo();

    if (activeTab === 'view') {
      if (viewPayPeriod.start && viewPayPeriod.end && viewPayPeriod.start <= viewPayPeriod.end) {
        fetchPayrollsForView();
      } else {
        setPayrolls([]);
        setIsLoadingView(false);
      }
    }
  }, [activeTab, fetchEmployeesAndCompanyInfo, fetchPayrollsForView, viewPayPeriod]);
  
  useEffect(() => { // Auto-fill deductions from employee profile
    if (selectedEmployee) {
      setStandardDeductions(prev => ({
        ...prev,
        sssDeduction: selectedEmployee.sssDeduction || 0,
        philhealthDeduction: selectedEmployee.philhealthDeduction || 0,
        hdmfDeduction: selectedEmployee.hdmfDeduction || 0,
        valeCashAdvance: 0,
        loanPayments: 0,
      }));
       setAdditionalEarnings({ adjustments: 0, bonuses: 0, thirteenthMonthPay: 0, otherEarnings: 0 });
    } else {
       setStandardDeductions({ valeCashAdvance: 0, loanPayments: 0, sssDeduction: 0, philhealthDeduction: 0, hdmfDeduction: 0 });
       setAdditionalEarnings({ adjustments: 0, bonuses: 0, thirteenthMonthPay: 0, otherEarnings: 0 });
    }
    setWorkDays([]); 
    setPayslipSummary(null); 
  }, [selectedEmployee]);


  const handleCreatePayrollRun = async () => {
    if (!viewPayPeriod.start || !viewPayPeriod.end || viewPayPeriod.start > viewPayPeriod.end) {
        alert("Please select a valid pay period for the payroll run.");
        return;
    }
    if (!window.confirm(`This will generate payslips for all eligible active employees for the period ${viewPayPeriod.start} to ${viewPayPeriod.end}. This may take a few moments. Continue?`)) return;
    setIsProcessingRun(true);
    setPageError(null);
    try {
      await createPayroll({ payPeriodStart: viewPayPeriod.start, payPeriodEnd: viewPayPeriod.end });
      alert("Payroll run successfully initiated. Payslips are being generated.");
      fetchPayrollsForView(); 
    } catch (error) {
        console.error("Error creating payroll run:", error);
        const errorMsg = `Failed to initiate payroll run. ${error instanceof Error ? error.message : String(error)}`;
        alert(errorMsg);
        setPageError(errorMsg);
    }
    setIsProcessingRun(false);
  };

  const handleGenerateWorkDays = async () => {
    if (!selectedEmployee || !createPayPeriod.start || !createPayPeriod.end) {
      alert("Please select an employee and a valid pay period.");
      return;
    }
    setIsGeneratingWorkDays(true);
    setPageError(null);
    try {
      const logs: TimeLog[] = await getTimeLogs({ 
        employeeId: selectedEmployee.employeeId, 
        startDate: createPayPeriod.start, 
        endDate: createPayPeriod.end 
      });
      
      const newWorkDays: WorkDayEntry[] = [];
      const currentDateLoop = new Date(createPayPeriod.start + 'T00:00:00');
      const endDateLoop = new Date(createPayPeriod.end + 'T00:00:00');

      while(currentDateLoop <= endDateLoop) {
        const dateStr = currentDateLoop.toISOString().split('T')[0];
        const dailyLogs = logs.filter(log => log.timestamp.toISOString().split('T')[0] === dateStr);
        dailyLogs.sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());

        let regHrs = 0;
        let otHrs = 0;
        let lastClockInTime: Date | null = null;

        for (const log of dailyLogs) {
          const logTime = log.timestamp; // Already a JS Date
          if (log.type === 'Clock In') {
            lastClockInTime = logTime;
          } else if (log.type === 'Clock Out' && lastClockInTime) {
            const durationMillis = logTime.getTime() - lastClockInTime.getTime();
            let hoursWorked = durationMillis / (1000 * 60 * 60);
            
             if (hoursWorked > 5) {
                const clockInHour = lastClockInTime.getHours();
                const clockOutHour = logTime.getHours();
                if (clockInHour < 13 && clockOutHour >= 13) {
                    hoursWorked -=1; 
                }
            }
            hoursWorked = Math.max(0, hoursWorked); 

            if (hoursWorked > 8) {
              regHrs += 8;
              otHrs += (hoursWorked - 8);
            } else {
              regHrs += hoursWorked;
            }
            lastClockInTime = null; 
          }
        }
        
        newWorkDays.push({
          id: dateStr, date: dateStr, regHrs: parseFloat(regHrs.toFixed(2)), otHrs: parseFloat(otHrs.toFixed(2)), 
          regHolHrs: 0, specHolHrs: 0, isRestDay: (currentDateLoop.getDay() === 0 || currentDateLoop.getDay() === 6), 
          notes: ''
        });
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }
      setWorkDays(newWorkDays);

    } catch (error) {
      console.error("Error generating work days:", error);
      const errorMsg = "Failed to generate work days from time logs. Check connection and logs.";
      alert(errorMsg);
      setPageError(errorMsg);
    }
    setIsGeneratingWorkDays(false);
  };
  
  const handleWorkDayChange = (index: number, field: keyof WorkDayEntry, value: string | number | boolean) => {
    const updated = [...workDays];
    if (typeof updated[index][field] === 'number' && typeof value === 'string') {
        (updated[index] as any)[field] = parseFloat(value) || 0;
    } else {
        (updated[index] as any)[field] = value;
    }
    setWorkDays(updated);
    calculatePayslipSummary(updated, additionalEarnings, standardDeductions);
  };

  const handleAdditionalEarningsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    const newEarnings = {...additionalEarnings, [name]: parseFloat(value) || 0};
    setAdditionalEarnings(newEarnings);
     calculatePayslipSummary(workDays, newEarnings, standardDeductions);
  };
  const handleStandardDeductionsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    const newDeductions = {...standardDeductions, [name]: parseFloat(value) || 0};
    setStandardDeductions(newDeductions);
    calculatePayslipSummary(workDays, additionalEarnings, newDeductions);
  };

  const calculatePayslipSummary = useCallback((currentWorkDays: WorkDayEntry[], currentEarnings: typeof additionalEarnings, currentDeductions: typeof standardDeductions) => {
    if (!selectedEmployee) {
        setPayslipSummary(null);
        return;
    }

    let grossPay = 0;
    const dailyRate = selectedEmployee.salaryType === 'Daily' ? selectedEmployee.basicSalary : (selectedEmployee.basicSalary / 21.67); 
    const hourlyRate = selectedEmployee.hourlyRate || (dailyRate / 8);

    currentWorkDays.forEach(day => {
        let dailyGross = 0;
        dailyGross += day.regHrs * hourlyRate;
        dailyGross += day.otHrs * hourlyRate * (selectedEmployee.overtimeMultiplier || 1.25);
        dailyGross += day.regHolHrs * dailyRate * ((selectedEmployee.regularHolidayMultiplier || 2.0)-1); 
        dailyGross += day.specHolHrs * dailyRate * ((selectedEmployee.specialHolidayMultiplier || 1.3)-1); 
        
        if (day.regHolHrs > 0 && day.isRestDay) { 
             dailyGross += day.regHolHrs * dailyRate * 0.30; 
        }
        if(day.isRestDay && (day.regHrs > 0 || day.otHrs > 0)){
            dailyGross += (day.regHrs + day.otHrs) * hourlyRate * ((selectedEmployee.restDayOvertimeMultiplier || 1.3)-1);
        }
        grossPay += dailyGross;
    });
    
    grossPay += currentEarnings.adjustments + currentEarnings.bonuses + currentEarnings.thirteenthMonthPay + currentEarnings.otherEarnings;

    const totalDeductions = currentDeductions.valeCashAdvance + currentDeductions.loanPayments + currentDeductions.sssDeduction + currentDeductions.philhealthDeduction + currentDeductions.hdmfDeduction;
    const netPay = grossPay - totalDeductions;

    setPayslipSummary({ gross: parseFloat(grossPay.toFixed(2)), totalDeductions: parseFloat(totalDeductions.toFixed(2)), net: parseFloat(netPay.toFixed(2)) });
  }, [selectedEmployee]);

  useEffect(() => { 
    if(activeTab === 'create' && selectedEmployee && workDays.length > 0){ 
        calculatePayslipSummary(workDays, additionalEarnings, standardDeductions);
    } else if (activeTab === 'create' && selectedEmployee && workDays.length === 0) {
        setPayslipSummary(null); 
    }
  }, [workDays, additionalEarnings, standardDeductions, selectedEmployee, calculatePayslipSummary, activeTab]);


  const handleSavePayslip = async () => {
    if (!selectedEmployee || !payslipSummary || workDays.length === 0) {
      alert("Employee, work days, and summary are required to save payslip.");
      return;
    }
    setIsSavingPayslip(true);
    setPageError(null);
    try {
      const payslipToSave: Omit<Payroll, 'id' | 'createdAt'> = {
        employeeId: selectedEmployee.employeeId,
        payPeriodStart: createPayPeriod.start,
        payPeriodEnd: createPayPeriod.end,
        payDateIssued: payDateIssued,
        grossPay: payslipSummary.gross,
        deductions: payslipSummary.totalDeductions,
        netPay: payslipSummary.net,
      };
      await addSinglePayslip(payslipToSave);
      alert(`Payslip for ${selectedEmployee.firstName} ${selectedEmployee.lastName} saved successfully!`);
      
      setWorkDays([]);
      setPayslipSummary(null);
    } catch (error) {
      console.error("Error saving payslip:", error);
      const errorMsg = `Failed to save payslip. ${error instanceof Error ? error.message : String(error)}`;
      alert(errorMsg);
      setPageError(errorMsg);
    }
    setIsSavingPayslip(false);
  };
  
  const filteredViewPayrolls = payrolls.filter(p => {
    const emp = employees.find(e => e.employeeId === p.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
    const searchTermLower = viewFilters.searchTerm.toLowerCase();
    
    const matchesEmployee = viewFilters.employeeId ? p.employeeId === viewFilters.employeeId : true;
    const matchesSearch = viewFilters.searchTerm ? 
        (empName.includes(searchTermLower) || 
         p.employeeId.toLowerCase().includes(searchTermLower) ||
         p.payPeriodStart.includes(searchTermLower) || 
         p.payPeriodEnd.includes(searchTermLower))
        : true;
    return matchesEmployee && matchesSearch;
  });

  const handleOpenPayslipPreview = (payroll: Payroll) => {
    const employee = employees.find(e => e.employeeId === payroll.employeeId);
    if (employee && companyInfoForPayslip) {
        setSelectedPayrollForPreview(payroll);
        setSelectedEmployeeForPreview(employee);
        setIsPayslipModalOpen(true);
    } else {
        alert("Employee details or company information not found for this payslip.");
    }
  };

  const renderCreatePayslipTab = () => (
    <div className="space-y-6">
      {/* Selection & Period */}
      <div className="p-5 bg-white shadow-card rounded-xl">
        <h2 className="text-xl font-semibold text-brand-primary mb-4 border-b pb-2">Selection & Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="employeeSelect" className="block text-sm font-medium text-slate-600 mb-1">Employee*</label>
            <select id="employeeSelect" value={selectedEmployee?.id || ''} onChange={(e) => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) || null)} className="input-base w-full bg-white" required>
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="payDateIssued" className="block text-sm font-medium text-slate-600 mb-1">Pay Date (Date Issued)*</label>
            <input type="date" id="payDateIssued" value={payDateIssued} onChange={e => setPayDateIssued(e.target.value)} className="input-base w-full" required />
          </div>
          <div>
            <label htmlFor="createPayPeriodStart" className="block text-sm font-medium text-slate-600 mb-1">Pay Period Start*</label>
            <input type="date" id="createPayPeriodStart" value={createPayPeriod.start} onChange={e => setCreatePayPeriod(prev => ({...prev, start: e.target.value}))} className="input-base w-full" max={createPayPeriod.end} required />
          </div>
          <div>
            <label htmlFor="createPayPeriodEnd" className="block text-sm font-medium text-slate-600 mb-1">Pay Period End*</label>
            <input type="date" id="createPayPeriodEnd" value={createPayPeriod.end} onChange={e => setCreatePayPeriod(prev => ({...prev, end: e.target.value}))} className="input-base w-full" min={createPayPeriod.start} required />
          </div>
        </div>
      </div>

      {/* Work Days & Hours */}
      {selectedEmployee && (
        <div className="p-5 bg-white shadow-card rounded-xl">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-semibold text-brand-primary">Work Days & Hours</h2>
                <button type="button" onClick={handleGenerateWorkDays} className="btn btn-neutral text-sm py-1.5 px-3" disabled={isGeneratingWorkDays || !selectedEmployee}>
                    {isGeneratingWorkDays ? 'Generating...' : 'Generate/Refresh Work Days'}
                </button>
            </div>
            {workDays.length === 0 && !isGeneratingWorkDays && <p className="text-slate-500 text-center py-4">Generate work days from time logs or add them manually to calculate payslip.</p>}
            {isGeneratingWorkDays && <p className="text-slate-500 text-center py-4">Loading work days...</p>}
            {workDays.length > 0 && (
                <div className="overflow-x-auto max-h-96 scrollbar-sleek">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                        {['Date', 'Reg Hrs', 'OT Hrs', 'Reg Hol Hrs', 'Spec Hol Hrs', 'Rest Day?', 'Notes'].map(h => <th key={h} className="p-2 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>)}
                    </tr>
                    </thead>
                    <tbody>
                    {workDays.map((wd, index) => (
                        <tr key={wd.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-1.5 whitespace-nowrap">{new Date(wd.date + 'T00:00:00').toLocaleDateString()}</td>
                        { (['regHrs', 'otHrs', 'regHolHrs', 'specHolHrs'] as const).map(field => (
                            <td key={field} className="p-1.5">
                                <input type="number" value={wd[field]} onChange={(e) => handleWorkDayChange(index, field, e.target.value)} className="input-base py-1 px-1.5 w-20 text-xs" step="0.01" min="0"/>
                            </td>
                        ))}
                        <td className="p-1.5 text-center">
                            <input type="checkbox" checked={wd.isRestDay} onChange={(e) => handleWorkDayChange(index, 'isRestDay', e.target.checked)} className="form-checkbox h-4 w-4 text-brand-accent rounded border-slate-300 focus:ring-brand-accent"/>
                        </td>
                        <td className="p-1.5">
                            <input type="text" value={wd.notes || ''} onChange={(e) => handleWorkDayChange(index, 'notes', e.target.value)} className="input-base py-1 px-1.5 w-full text-xs" placeholder="Notes"/>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
      )}

      {/* Additional Earnings & Deductions */}
      {selectedEmployee && workDays.length > 0 && (
        <div className="p-5 bg-white shadow-card rounded-xl">
          <h2 className="text-xl font-semibold text-brand-primary mb-4 border-b pb-2">Additional Earnings & Deductions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <h3 className="text-lg font-medium text-slate-700 md:col-span-2 lg:col-span-3 mt-2">Earnings</h3>
            {Object.entries(additionalEarnings).map(([key, value]) => (
                <div key={key}>
                    <label htmlFor={key} className="block text-xs font-medium text-slate-500 mb-0.5 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input type="number" id={key} name={key} value={value} onChange={handleAdditionalEarningsChange} className="input-base w-full" step="0.01" min="0"/>
                </div>
            ))}
            <h3 className="text-lg font-medium text-slate-700 md:col-span-2 lg:col-span-3 mt-4">Deductions</h3>
            {Object.entries(standardDeductions).map(([key, value]) => (
                <div key={key}>
                    <label htmlFor={key} className="block text-xs font-medium text-slate-500 mb-0.5 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input type="number" id={key} name={key} value={value} onChange={handleStandardDeductionsChange} className="input-base w-full" step="0.01" min="0"/>
                </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Payslip Summary & Actions */}
      {selectedEmployee && workDays.length > 0 && payslipSummary && (
        <div className="p-5 bg-white shadow-card rounded-xl sticky bottom-0 border-t-4 border-brand-accent z-20">
          <h2 className="text-xl font-semibold text-brand-primary mb-3">Payslip Summary & Actions</h2>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div><p className="text-xs text-slate-500">Gross Pay</p><p className="text-lg font-semibold text-green-600">${payslipSummary.gross.toFixed(2)}</p></div>
                <div><p className="text-xs text-slate-500">Total Deductions</p><p className="text-lg font-semibold text-red-600">(${payslipSummary.totalDeductions.toFixed(2)})</p></div>
                <div><p className="text-xs text-slate-500">Net Pay</p><p className="text-xl font-bold text-brand-primary">${payslipSummary.net.toFixed(2)}</p></div>
            </div>
            <div className="text-right">
                <button type="button" onClick={handleSavePayslip} className="btn-secondary" disabled={isSavingPayslip}>
                    {isSavingPayslip ? 'Saving...' : 'Calculate & Save Payslip'}
                </button>
            </div>
             <p className="text-xs text-slate-400 mt-2 text-center">Review all entries carefully. Click "Calculate & Save" to finalize.</p>
        </div>
      )}
    </div>
  );

  const renderViewGeneratedPayslipsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-0 gap-4 p-5 bg-white shadow-card rounded-xl">
        <div className="flex-grow">
            <h2 className="text-xl font-semibold text-brand-primary mb-1">Previously Generated Payslips</h2>
            <p className="text-xs text-slate-500">This list reflects saved payrolls. Use filters to narrow results.</p>
        </div>
        <button 
            type="button"
            onClick={handleCreatePayrollRun} 
            className="btn-primary flex-shrink-0 mt-3 sm:mt-0"
            disabled={isLoadingView || isProcessingRun || !viewPayPeriod.start || !viewPayPeriod.end || viewPayPeriod.start > viewPayPeriod.end}
        >
          {isProcessingRun ? 'Processing...' : (isLoadingView ? 'Loading...' : 'Create Payroll Run')}
        </button>
      </div>

      <div className="p-5 bg-white shadow-card rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label htmlFor="viewPayPeriodStart" className="block text-sm font-medium text-slate-600 mb-1">Start Date</label>
              <input type="date" id="viewPayPeriodStart" value={viewPayPeriod.start} onChange={(e) => setViewPayPeriod(prev => ({...prev, start: e.target.value}))} className="input-base w-full" max={viewPayPeriod.end} />
            </div>
            <div className="md:col-span-3">
              <label htmlFor="viewPayPeriodEnd" className="block text-sm font-medium text-slate-600 mb-1">End Date</label>
              <input type="date" id="viewPayPeriodEnd" value={viewPayPeriod.end} onChange={(e) => setViewPayPeriod(prev => ({...prev, end: e.target.value}))} className="input-base w-full" min={viewPayPeriod.start} />
            </div>
             <div className="md:col-span-3">
                <label htmlFor="viewEmployeeFilter" className="block text-sm font-medium text-slate-600 mb-1">Employee</label>
                <select id="viewEmployeeFilter" value={viewFilters.employeeId} onChange={(e) => setViewFilters(prev => ({...prev, employeeId: e.target.value}))} className="input-base w-full bg-white">
                    <option value="">All Employees</option>
                    {employees.map(emp => <option key={emp.id} value={emp.employeeId}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
                </select>
            </div>
            <div className="md:col-span-3">
                <label htmlFor="viewSearchTerm" className="block text-sm font-medium text-slate-600 mb-1">Search Name/Period</label>
                <input type="text" id="viewSearchTerm" placeholder="Search..." value={viewFilters.searchTerm} onChange={(e) => setViewFilters(prev => ({...prev, searchTerm: e.target.value}))} className="input-base w-full"/>
            </div>
        </div>
      </div>
      
      {isLoadingView && filteredViewPayrolls.length === 0 ? (
         <div className="text-center text-slate-500 py-20 bg-white shadow-card rounded-xl"><p>Loading payroll data...</p></div>
      ) : !isLoadingView && filteredViewPayrolls.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-white shadow-card rounded-xl">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl font-semibold">No Payroll Data</p>
            <p className="text-sm">No payrolls found for this period or matching filters.</p>
        </div>
      ) : (
        <div className="bg-white shadow-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  {['Employee Name', 'Pay Period', 'Pay Date', 'Net Pay', 'Actions'].map(h => <th key={h} scope="col" className={`px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider ${h === 'Net Pay' ? 'text-right' : 'text-left'} ${h==='Actions' && 'text-center'}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredViewPayrolls.map((payroll) => {
                  const emp = employees.find(e => e.employeeId === payroll.employeeId);
                  return (
                    <tr key={payroll.id} className="hover:bg-slate-50/75 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{emp ? `${emp.firstName} ${emp.lastName}` : payroll.employeeId} <span className="text-xs text-slate-500">({payroll.employeeId})</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{payroll.payPeriodStart ? new Date(payroll.payPeriodStart + 'T00:00:00').toLocaleDateString() : 'N/A'} - {payroll.payPeriodEnd ? new Date(payroll.payPeriodEnd + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{payroll.payDateIssued ? new Date(payroll.payDateIssued  + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-brand-secondary text-right">${payroll.netPay.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button 
                            type="button"
                            onClick={() => handleOpenPayslipPreview(payroll)} 
                            className="btn-link text-sm hover:underline"
                            aria-label={`View payslip for ${emp ? emp.firstName + ' ' + emp.lastName : payroll.employeeId}`}
                        >
                            View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );


  return (
    <div className="container mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-brand-primary mb-6 md:mb-8">Payroll</h1>
      {pageError && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm" role="alert">
          <strong className="font-semibold">Error:</strong> {pageError}
        </div>
      )}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {(['create', 'view'] as PayrollTab[]).map(tab => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm capitalize
                ${activeTab === tab
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab === 'create' ? 'Create Payslip' : 'View Generated Payslips'}
            </button>
          ))}
        </nav>
      </div>
      <div className="py-2">
        {activeTab === 'create' && renderCreatePayslipTab()}
        {activeTab === 'view' && renderViewGeneratedPayslipsTab()}
      </div>
      
      {isPayslipModalOpen && (
        <PayslipPreviewModal
          isOpen={isPayslipModalOpen}
          onClose={() => setIsPayslipModalOpen(false)}
          payroll={selectedPayrollForPreview}
          employee={selectedEmployeeForPreview}
          companyInfo={companyInfoForPayslip}
        />
      )}
    </div>
  );
};

export default PayrollPage;
