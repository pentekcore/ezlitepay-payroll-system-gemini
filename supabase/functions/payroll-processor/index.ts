import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { payPeriodStart, payPeriodEnd } = await req.json()
    
    // Validate input
    if (!payPeriodStart || !payPeriodEnd) {
      return new Response(
        JSON.stringify({ error: 'Missing pay period dates' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch active employees
    const { data: employees, error: empError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('is_archived', false)
      .eq('status', 'Active')

    if (empError) throw empError

    // Process payroll for each employee
    const payrollEntries = employees.map(emp => {
      // Simplified payroll calculation
      let grossPay = 0
      if (emp.salary_type === 'Monthly') {
        grossPay = emp.basic_salary || 0
      } else if (emp.salary_type === 'Daily') {
        grossPay = (emp.basic_salary || 0) * 22
      } else {
        grossPay = ((emp.hourly_rate || emp.basic_salary / 8) || 0) * 22 * 8
      }

      const totalDeductions = (emp.sss_deduction || 0) + (emp.philhealth_deduction || 0) + (emp.hdmf_deduction || 0)
      const netPay = grossPay - totalDeductions

      return {
        employee_id: emp.employee_id,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
        pay_date_issued: new Date().toISOString().split('T')[0],
        gross_pay: parseFloat(grossPay.toFixed(2)),
        deductions: parseFloat(totalDeductions.toFixed(2)),
        net_pay: parseFloat(netPay.toFixed(2))
      }
    })

    // Insert payroll entries
    const { error: insertError } = await supabaseClient
      .from('payrolls')
      .upsert(payrollEntries, {
        onConflict: 'employee_id,pay_period_start,pay_period_end'
      })

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount: payrollEntries.length,
        message: 'Payroll processed successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Error in payroll-processor function:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})