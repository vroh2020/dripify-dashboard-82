import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jjqwhxamjxsiotnhhqco.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXdoeGFtanhzaW90bmhocWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzIzODMsImV4cCI6MjA0ODA0ODM4M30.jhBnN2l91FzQjbQHTAIZ_z7yBrL6YOyOckjZnv-E4To';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTables() {
  try {
    console.log('🔧 Setting up Trendza tables...');
    
    const { data, error } = await supabase.functions.invoke('create-tables', {
      body: {}
    });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ Tables created successfully:', data);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupTables();
