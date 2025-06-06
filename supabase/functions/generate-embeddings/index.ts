// Supabase Edge Function for generating embeddings
// This function is called by the automatic embedding system

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { table, id, content, metadata } = await req.json()

    // Validate input
    if (!table || !id || !content) {
      throw new Error('Missing required fields: table, id, or content')
    }

    console.log(`Generating embedding for ${table}:${id}`)

    // Call OpenAI to generate embedding
    const openAIResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content.substring(0, 8000), // Limit to 8000 chars for token limits
        model: 'text-embedding-ada-002',
      }),
    })

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const openAIData = await openAIResponse.json()
    const embedding = openAIData.data[0].embedding

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update the row with the embedding
    const { error: updateError } = await supabase
      .from(table)
      .update({ 
        embedding: embedding,
        embedding_generated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to update ${table}: ${updateError.message}`)
    }

    // Log success
    console.log(`Successfully generated embedding for ${table}:${id}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Embedding generated successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error.message)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})