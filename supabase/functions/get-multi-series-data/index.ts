import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  cycleLimit: number;
  selectedMeters: string[];
  selectedMetric: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting get-multi-series-data function');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    const { cycleLimit, selectedMeters, selectedMetric }: RequestBody = await req.json();
    console.log('📊 Request params:', { cycleLimit, selectedMeters, selectedMetric });

    // Get user profile and client data
    const { data: profile } = await supabase
      .from('profiles')
      .select('cliente_id')
      .eq('id', user.id)
      .single();

    if (!profile?.cliente_id) {
      console.error('❌ User profile not found or missing cliente_id');
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('👤 User cliente_id:', profile.cliente_id);

    // Get client pricing
    const { data: client } = await supabase
      .from('api_clientes')
      .select('preco_por_ipu')
      .eq('id', profile.cliente_id)
      .single();

    if (!client?.preco_por_ipu) {
      console.error('❌ Client pricing not found');
      return new Response(
        JSON.stringify({ error: 'Client pricing not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 Price per IPU:', client.preco_por_ipu);

    // Get configuration IDs
    const { data: configs } = await supabase
      .from('api_configuracaoidmc')
      .select('id')
      .eq('cliente_id', profile.cliente_id);

    if (!configs || configs.length === 0) {
      console.error('❌ No configurations found');
      return new Response(
        JSON.stringify({ error: 'No configurations found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const configIds = configs.map(config => config.id);
    console.log('⚙️ Configuration IDs:', configIds);

    // Get available cycles
    const { data: allCycles } = await supabase
      .rpc('get_available_cycles');

    if (!allCycles) {
      console.error('❌ No cycles found');
      return new Response(
        JSON.stringify({ error: 'No cycles found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort cycles and limit
    const sortedCycles = allCycles
      .sort((a, b) => new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime())
      .slice(-cycleLimit);

    console.log('📅 Processing cycles:', sortedCycles.length);

    // Get available meters
    const { data: meterData } = await supabase
      .from('api_consumosummary')
      .select('meter_name')
      .in('configuracao_id', configIds)
      .gt('consumption_ipu', 0)
      .neq('meter_name', 'Sandbox Organizations IPU Usage')
      .neq('meter_name', 'Metadata Record Consumption');

    const availableMeters = [...new Set(
      meterData?.map(item => item.meter_name).filter(Boolean) || []
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    console.log('🏷️ Available meters:', availableMeters.length);

    // Determine which metrics to include
    const includeAll = selectedMeters.includes('all');
    const metricsToInclude = includeAll ? availableMeters : selectedMeters.filter(m => m !== 'all');

    console.log('📋 Metrics to include:', metricsToInclude);

    // Fetch ALL consumption data without limit using pagination
    const allConsumptionData = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    console.log('🔄 Starting data fetching with pagination...');

    while (hasMore) {
      console.log(`📦 Fetching batch from ${from} to ${from + batchSize - 1}`);
      
      const { data: batchData, error } = await supabase
        .from('api_consumosummary')
        .select('billing_period_start_date, billing_period_end_date, consumption_ipu, meter_name')
        .in('configuracao_id', configIds)
        .gt('consumption_ipu', 0)
        .neq('meter_name', 'Sandbox Organizations IPU Usage')
        .order('billing_period_start_date')
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('❌ Error fetching batch:', error);
        throw error;
      }

      if (!batchData || batchData.length === 0) {
        hasMore = false;
        break;
      }

      allConsumptionData.push(...batchData);
      console.log(`✅ Fetched ${batchData.length} records, total: ${allConsumptionData.length}`);

      if (batchData.length < batchSize) {
        hasMore = false;
      } else {
        from += batchSize;
      }
    }

    console.log(`🎯 Total consumption records fetched: ${allConsumptionData.length}`);

    // Process data into periods
    const periodMap = new Map();

    // Initialize all cycles
    sortedCycles.forEach(cycle => {
      const periodKey = `${cycle.billing_period_start_date}_${cycle.billing_period_end_date}`;
      const periodLabel = `${new Date(cycle.billing_period_start_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(cycle.billing_period_end_date + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
      
      const periodData: any = {
        period: periodLabel,
        billing_period_start_date: cycle.billing_period_start_date,
        billing_period_end_date: cycle.billing_period_end_date,
        periodStart: cycle.billing_period_start_date,
        periodEnd: cycle.billing_period_end_date,
        totalIPU: 0,
        totalCost: 0
      };

      // Initialize each metric with zero
      metricsToInclude.forEach(metricName => {
        const metricKey = metricName.replace(/[^a-zA-Z0-9]/g, '_');
        periodData[`${metricKey}_ipu`] = 0;
        periodData[`${metricKey}_cost`] = 0;
      });
      
      periodMap.set(periodKey, periodData);
    });

    console.log('🗺️ Initialized period map with', periodMap.size, 'periods');

    // Aggregate consumption data
    let processedRecords = 0;
    allConsumptionData.forEach(item => {
      const periodKey = `${item.billing_period_start_date}_${item.billing_period_end_date}`;
      if (periodMap.has(periodKey)) {
        const periodData = periodMap.get(periodKey);
        const itemIPU = item.consumption_ipu || 0;
        const itemCost = itemIPU * client.preco_por_ipu;
        
        // Add to total
        periodData.totalIPU += itemIPU;
        periodData.totalCost += itemCost;
        
        // Add to specific metric if selected
        if (metricsToInclude.includes(item.meter_name)) {
          const metricKey = item.meter_name.replace(/[^a-zA-Z0-9]/g, '_');
          periodData[`${metricKey}_ipu`] = (periodData[`${metricKey}_ipu`] || 0) + itemIPU;
          periodData[`${metricKey}_cost`] = (periodData[`${metricKey}_cost`] || 0) + itemCost;
        }
        
        processedRecords++;
      }
    });

    console.log('🔍 Processed', processedRecords, 'consumption records');

    // Convert to array and sort
    const result = Array.from(periodMap.values())
      .sort((a, b) => new Date(a.billing_period_start_date).getTime() - new Date(b.billing_period_start_date).getTime());

    console.log('📊 Final result contains', result.length, 'periods');
    console.log('💯 Function completed successfully');

    return new Response(
      JSON.stringify({ 
        data: result, 
        totalRecords: allConsumptionData.length,
        availableMeters: availableMeters 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});