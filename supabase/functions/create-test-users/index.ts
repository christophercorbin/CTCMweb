import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const users = [
      {
        email: 'admin@skybox.com',
        password: 'admin123',
        user_metadata: {
          role: 'admin',
          name: 'Admin User',
        },
      },
      {
        email: 'customer@skybox.com',
        password: 'customer123',
        user_metadata: {
          role: 'customer',
          name: 'John Customer',
        },
      },
    ];

    const results = [];

    for (const user of users) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.user_metadata,
      });

      if (error) {
        results.push({ email: user.email, success: false, error: error.message });
      } else {
        results.push({ email: user.email, success: true, userId: data.user.id });
      }
    }

    // Create sample invoices for customer user
    const customerResult = results.find(r => r.email === 'customer@skybox.com');
    if (customerResult?.success && customerResult.userId) {
      const invoices = [
        {
          customer_id: customerResult.userId,
          invoice_number: 'INV-2024-001',
          shipment_id: crypto.randomUUID(),
          shipment_tracking: 'SKY123456789',
          amount: 299.99,
          status: 'paid',
          issue_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          paid_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          customer_id: customerResult.userId,
          invoice_number: 'INV-2024-002',
          shipment_id: crypto.randomUUID(),
          shipment_tracking: 'SKY987654321',
          amount: 450.00,
          status: 'pending',
          issue_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          paid_date: null,
        },
        {
          customer_id: customerResult.userId,
          invoice_number: 'INV-2024-003',
          shipment_id: crypto.randomUUID(),
          shipment_tracking: 'SKY555666777',
          amount: 125.50,
          status: 'overdue',
          issue_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          paid_date: null,
        },
      ];

      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoices);

      if (invoiceError) {
        results.push({ message: 'Invoice creation failed', error: invoiceError.message });
      } else {
        results.push({ message: '3 sample invoices created successfully' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error creating test users:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
