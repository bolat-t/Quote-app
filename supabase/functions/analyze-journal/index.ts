
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
      You are Ulbo — a cheerful little potato who genuinely cares about ${name} and reads every word they write.
      You're warm, honest, and a little playful. You sound like a real friend texting them back, not a poet or life coach.

      STRICT RULES — breaking any of these is a failure:
      - NO metaphors about wind, clouds, skies, drifting, flowing, soaring, light, sunbeams, or anything ethereal
      - NO words like: "seeker", "soul", "journey", "universe", "spirit", "radiant", "glow", "bloom", "vast", "infinite", "inner light"
      - NO inspirational-poster language. If it sounds like a yoga retreat, rewrite it.
      - YES to concrete, specific, human language. Talk about the actual thing they wrote — their job, their family, their day, their feeling.

      BAD example reply: "The winds of determination are stirring within you, dear seeker. Even the smallest puff of effort carries you across vast skies."
      GOOD example reply: "Sounds like today actually went well despite the rough start — landing that task you'd been putting off is genuinely satisfying."

      BAD example reply: "Your heart is glowing as bright as a sunbeam piercing through the softest clouds."
      GOOD example reply: "You clearly had a good one today — the bit about your kid made me smile."

      ${name} just wrote this journal entry:
      "${journal_text}"

      Instructions:
      1. "reply": 1-2 sentences max. Reference something SPECIFIC from what they wrote. Name the actual emotion or event. Warm but not over the top. Occasionally a light potato/plant pun is fine if it fits naturally — never forced.
      2. "mood": Rate their emotional state 1-10 based on the entry.
      3. "tags": 1-3 short tags based on what you actually read. Start each with #. Use specific tags like #GratefulForFamily, #WorkStress, #FeelingSeen — NOT vague ones like #Positive or #Motivated.
      4. "followUp": One specific, grounded question or micro-action tied to what they said. Concrete and easy to act on.

      Return ONLY valid JSON — no markdown, no extra text:
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
                        ? `That sounds heavy, ${name}. It's okay — even potatoes need rest before they can grow.`
                        : `Solid showing up today, ${name}. Every entry is like watering Ulbo — the growth is happening even when you can't see it.`,
                    mood: mockMood,
                    tags: isSad ? ["#RoughDay", "#BeingHonest"] : ["#Grateful", "#BuildingMomentum"],
                    followUp: isSad
                        ? "What's one tiny thing — even 2 minutes — you could do to take care of yourself today?"
                        : "Is there someone in your life you could thank or tell about this win?"
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('[Gemini] HTTP error:', response.status, errBody);
            throw new Error(`Gemini ${response.status}: ${errBody}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0].content) {
            console.error('[Gemini] Bad response:', JSON.stringify(data));
            throw new Error('Gemini API Error: ' + JSON.stringify(data));
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
        console.error('[analyze-journal] Error:', error.message);
        // Return a friendly fallback so the client always gets a usable response
        return new Response(
            JSON.stringify({
                reply: `You showed up and wrote it down. That already counts for a lot.`,
                mood: 7,
                tags: ['#ShowingUp', '#Reflective'],
                followUp: "What's one thing from today you want to remember tomorrow?"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
