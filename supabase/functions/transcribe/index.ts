// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// import { corsHeaders } from "../_shared/cors.ts" // This import is commented out in the new code
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// If cors.ts doesn't exist, I'll define headers locally to be safe.
const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors })
    }

    try {
        // 1. Verify User (JWT)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        // Initialize Supabase Client with the user's auth context
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // Verify the token is valid and get the user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized: Invalid Token')
        }

        // 2. Check Daily Rate Limit (e.g. 50 requests/day)
        const today = new Date().toISOString().split('T')[0]
        const { data: usage } = await supabaseClient
            .from('api_usage')
            .select('request_count')
            .eq('user_id', user.id)
            .eq('date', today)
            .eq('endpoint', 'transcribe')
            .single()

        const currentCount = usage?.request_count || 0;

        if (currentCount >= 50) {
            throw new Error('Daily limit reached (50). Please try again tomorrow.')
        }

        // 3. Increment Usage Logic
        // We increment *before* or *after*? 
        // Safest to increment *before* attempting API call to prevent free misuse if API fails late.
        // However, if the user sends bad data, they lose a credit. That's acceptable for abuse prevention.
        const { error: upsertError } = await supabaseClient
            .from('api_usage')
            .upsert({
                user_id: user.id,
                date: today,
                endpoint: 'transcribe',
                request_count: currentCount + 1
            }, { onConflict: 'user_id, date, endpoint' })

        if (upsertError) console.error("Failed to track usage:", upsertError)

        // 4. Parse Body
        const bodyText = await req.text();
        if (!bodyText) throw new Error("Request body is empty");

        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            throw new Error("Invalid JSON body");
        }

        const { audio_url, audio_base64 } = body;
        let base64Audio = audio_base64;

        if (!base64Audio && audio_url) {
            console.log(`[Transcribe] Fetching audio from URL: ${audio_url}`);
            const audioResp = await fetch(audio_url);
            if (!audioResp.ok) throw new Error(`Failed to fetch audio file: ${audioResp.statusText}`);
            const arrayBuffer = await audioResp.arrayBuffer();
            base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        }

        if (!base64Audio) {
            throw new Error("Missing audio_url or audio_base64");
        }

        // 5. Call Gemini
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error("Server misconfiguration: missing GEMINI_API_KEY");

        console.log("[Transcribe] Sending to Gemini...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Transcribe the following audio exactly as spoken. Return ONLY the text." },
                        {
                            inline_data: {
                                mime_type: "audio/mp4",
                                data: base64Audio
                            }
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Transcribe] Gemini API Error (${response.status}):`, errText);
            throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0].content) {
            console.error("[Transcribe] Unexpected Gemini Response:", JSON.stringify(data));
            throw new Error("Gemini returned no content candidates");
        }

        const text = data.candidates[0].content.parts[0].text;
        console.log(`[Transcribe] Success. Length: ${text.length}`);

        return new Response(
            JSON.stringify({ text }),
            { headers: { ...cors, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("[Transcribe] Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...cors, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
