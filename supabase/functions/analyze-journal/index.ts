
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { journal_text, user_name } = await req.json()

        if (!journal_text) {
            throw new Error('Missing journal_text');
        }

        const name = user_name || "Friend";

        // Prepare prompt
        const prompt = `
      You are Ulbo — a caring, direct companion helping ${name} build a daily gratitude habit.
      Think of yourself as a supportive friend who genuinely reads what they write and responds with real warmth.
      You believe small daily actions create big change (like tending a bonsai — patience + consistency = growth).
      You're casual, honest, and a little playful. Never mystical, never preachy, never generic.

      ${name} just wrote this journal entry:
      "${journal_text}"

      Instructions:
      1. "reply": 1-2 sentences max. Reference something SPECIFIC from what they wrote. Name the emotion or theme you noticed. Warm but not over the top. Sound like a real friend, not a therapist.
      2. "mood": Rate their emotional state 1-10 based on the entry.
      3. "tags": 1-3 tags based on what you actually read (e.g., #GratefulForFamily, #WorkStress, #FeelingSeen — NOT generic tags like #Positive).
      4. "followUp": One specific, grounded question or micro-action tied to what they said. Make it feel easy to answer or do.

      Return ONLY valid JSON:
      {
        "reply": "string",
        "mood": number,
        "tags": ["string", "string"],
        "followUp": "string"
      }
    `;

        // Gemini API Logic
        const apiKey = Deno.env.get('GEMINI_API_KEY') || 'AIzaSy...'; // Placeholder

        if (!Deno.env.get('GEMINI_API_KEY')) {
            console.log("No GEMINI_API_KEY, returning mock.");
            // Mock logic for dev without keys
            // Simple sentiment guess
            const isSad = journal_text.match(/sad|tired|bad|fail/i);
            const mockMood = isSad ? 4 : 8;
            return new Response(
                JSON.stringify({
                    reply: isSad
                        ? `That sounds heavy, ${name}. It's okay to have days like this — even the best bonsai needs time to recover.`
                        : `That's a solid entry, ${name}. Showing up consistently is literally how growth happens. 🌱`,
                    mood: mockMood,
                    tags: isSad ? ["#RoughDay", "#BeingHonest"] : ["#Grateful", "#BuildingMomentum"],
                    followUp: isSad
                        ? "What's one tiny thing — even 2 minutes — you could do to take care of yourself today?"
                        : "Is there someone in your life you could thank or tell about this win?"
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!data.candidates || !data.candidates[0].content) {
            throw new Error('Gemini API Error');
        }

        const textResponse = data.candidates[0].content.parts[0].text;
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : textResponse;
        const analysis = JSON.parse(cleanJson);

        return new Response(
            JSON.stringify(analysis),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
