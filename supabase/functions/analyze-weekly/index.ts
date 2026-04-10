
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors })
    }

    try {
        // 1. Verify User
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // 2. Fetch Last 7 Days of Entries
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        // Format as YYYY-MM-DD for comparison (assuming date column is text or date)
        // Actually, journal_entries usually stores date as string YYYY-MM-DD based on previous files.
        // Let's check schema if needed, but assuming standard format.
        // Wait, previous code used `getTodayDateString`.

        const { data: entries, error: dbError } = await supabaseClient
            .from('journal_entries')
            .select('date, content, sentiment_tags, mood_score')
            .eq('user_id', user.id)
            .gte('date', sevenDaysAgo.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (dbError) throw dbError;

        if (!entries || entries.length < 3) {
            return new Response(
                JSON.stringify({
                    not_enough_data: true,
                    message: `You need at least 3 entries in the last 7 days to generate insights. You have ${entries?.length || 0}.`
                }),
                { headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Prepare Prompt
        const entriesText = entries.map(e => `[${e.date}] (Mood: ${e.mood_score}/10): ${e.content}`).join('\n');
        const prompt = `
    You are Ulbo — a cheerful little potato who has been watching over someone's week and genuinely cares about how they're doing.
    You believe in the power of small consistent actions — like a potato plant: water it every day and it keeps growing, even when you can't see it happening underground.
    Be honest, warm, and specific. Casual and direct — no mystical language, no vague platitudes.
    Reference their actual entries when possible. Sound like a thoughtful friend, not a self-help book. Occasionally sneak in a subtle potato/plant metaphor if it fits naturally — never forced.

    Here are their journal entries from the past week:
    ${entriesText}

    Identify:
    1. "summary": 2-3 sentences on how their week actually went. Mention specific things they wrote about.
    2. "key_theme": One concrete recurring theme you spotted (e.g., "work stress", "gratitude for family", "feeling disconnected").
    3. "strength": One real thing they demonstrated this week — be specific, not generic.
    4. "suggestion": One grounded, actionable thing they could try next week. Make it feel achievable, not overwhelming.

    Return strict JSON (no markdown formatting):
    {
        "summary": "...",
        "key_theme": "...",
        "strength": "...",
        "suggestion": "..."
    }
    `;

        // 4. Call Gemini
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!geminiResp.ok) {
            throw new Error(`Gemini API Error: ${await geminiResp.text()}`);
        }

        const geminiData = await geminiResp.json();
        const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) throw new Error("No response from AI");

        // Clean JSON (remove potential markdown code blocks)
        const jsonStr = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const insights = JSON.parse(jsonStr);

        return new Response(
            JSON.stringify(insights),
            { headers: { ...cors, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Error:", (error as Error).message);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { headers: { ...cors, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
