import { GoogleGenerativeAI as GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { Employee } from '../types';

// Assume process.env.API_KEY is pre-configured and accessible.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY for Gemini AI is not set. AI features will not work.");
  // Potentially throw an error or have a fallback mechanism depending on desired app behavior
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });
const modelName = 'gemini-2.5-flash-preview-04-17';

function serializeEmployeeDataForPrompt(employee: Employee): string {
  const relevantData: Record<string, any> = {
    'Employee ID': employee.employeeId,
    'First Name': employee.firstName,
    'Last Name': employee.lastName,
    'Gender': employee.gender,
    'Birth Date': employee.birthDate ? new Date(employee.birthDate).toLocaleDateString() : 'N/A',
    'Position': employee.position,
    'Department': employee.department,
    'Email': employee.email,
    'Start Date': employee.startDate ? new Date(employee.startDate).toLocaleDateString() : 'N/A',
    'Employee Type': employee.employeeType,
    'Status': employee.status,
    'Mobile Number': employee.mobileNumber,
    'Address': employee.address,
    'Emergency Contact Name': employee.emergencyContactName,
    'Emergency Contact Relationship': employee.emergencyContactRelationship,
    'Emergency Contact Number': employee.emergencyContactNumber,
    'Payment Method': employee.paymentMethod,
    'Bank Name': employee.bankName,
    'Account Number': employee.accountNumber,
    'Salary Type': employee.salaryType,
    'Basic Salary': employee.basicSalary,
    'Monthly Equivalent': employee.monthlyEquivalent,
    'Hourly Rate': employee.hourlyRate,
    'TIN Number': employee.tinNumber,
    'SSS Number': employee.sssNumber,
    'PhilHealth Number': employee.philhealthNumber,
    'Pag-IBIG Number': employee.pagibigNumber,
    'Overtime Multiplier': employee.overtimeMultiplier,
    'Regular Holiday Multiplier': employee.regularHolidayMultiplier,
    'Special Holiday Multiplier': employee.specialHolidayMultiplier,
    'Rest Day Overtime Multiplier': employee.restDayOvertimeMultiplier,
    'SSS Deduction': employee.sssDeduction,
    'PhilHealth Deduction': employee.philhealthDeduction,
    'HDMF Deduction': employee.hdmfDeduction,
    // Note: 'isArchived', 'id', 'createdAt', 'updatedAt', 'profilePictureUrl' are intentionally omitted for typical AI queries
  };

  let dataString = "";
  for (const [key, value] of Object.entries(relevantData)) {
    if (value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '0') {
      dataString += `${key}: ${value}\n`;
    }
  }
  return dataString.trim();
}

export async function askQuestionAboutEmployee(employee: Employee, userQuestion: string): Promise<string> {
  if (!API_KEY) {
    return "AI Service is not configured. Missing API Key.";
  }
  const serializedData = serializeEmployeeDataForPrompt(employee);

  const prompt = `You are an expert HR assistant for the company EZLitePay.
Your task is to answer questions about an employee based ONLY on the information provided below.
Do not use any external knowledge or make assumptions.
If the information to answer the question is not present in the provided data, clearly state that the information is not available in the employee's record or that you cannot answer based on the provided data.
Be concise and directly answer the question. Format your answer clearly.

Employee Data:
---
${serializedData}
---

Question: "${userQuestion}"

Answer:`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      // No thinkingConfig needed, default is fine for quality.
    });
    // The .text property directly gives the string output.
    return response.text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof Error) {
        // Provide a more user-friendly message for common issues if possible
        if (error.message.includes('API key not valid')) {
             return "Error: The AI API key is invalid. Please contact support.";
        }
        return `Error interacting with AI: ${error.message}.`;
    }
    return 'An unexpected error occurred while contacting the AI.';
  }
}