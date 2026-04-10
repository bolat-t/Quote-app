
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Strip characters commonly used in prompt injection attacks
const sanitize = (input: string, maxLen: number): string =>
    input.replace(/[<>{}\\]/g, '').slice(0, maxLen).trim();

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Rate limit: 30 requests/day (non-blocking — don't crash if api_usage has RLS issues)
        let currentCount = 0
        try {
            const today = new Date().toISOString().split('T')[0]
            const { data: usage } = await supabaseClient
                .from('api_usage')
                .select('request_count')
                .eq('user_id', user.id)
                .eq('date', today)
                .eq('endpoint', 'chat-ulbo')
                .single()

            currentCount = usage?.request_count ?? 0
            if (currentCount >= 30) {
                return new Response(
                    JSON.stringify({ reply: 'ulbo is resting for today. come back tomorrow and we can keep talking.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Increment usage counter
            await supabaseClient.from('api_usage').upsert({
                user_id: user.id,
                date: today,
                endpoint: 'chat-ulbo',
                request_count: currentCount + 1
            }, { onConflict: 'user_id, date, endpoint' })
        } catch (rateLimitErr) {
            console.warn('[chat-ulbo] Rate limit check failed (non-blocking):', (rateLimitErr as Error).message)
            // Continue without rate limiting — don't break the chat
        }

        // 3. Parse and sanitize inputs
        const { messages, quote, user_name, memory_context } = await req.json()

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Missing messages' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const safeName = sanitize(user_name || 'Friend', 50)
        const safeQuote = quote ? sanitize(quote.text || '', 500) : ''
        const safeQuoteAuthor = quote ? sanitize(quote.author || '', 100) : ''

        // Sanitize conversation history (keep last 10 messages to stay within context limits)
        const safeMessages = messages.slice(-10).map((msg: { role: string; text: string }) => ({
            role: msg.role === 'user' ? 'user' : 'ulbo',
            text: sanitize(msg.text || '', 500),
        }))

        // Build conversation transcript for the model
        const conversationTranscript = safeMessages
            .map((msg: { role: string; text: string }) => `${msg.role === 'user' ? safeName : 'Ulbo'}: ${msg.text}`)
            .join('\n')

        // Build memory context string if provided
        let memoryBlock = ''
        if (memory_context) {
            const parts: string[] = []
            if (memory_context.mood_trend) parts.push(`Their mood has been ${memory_context.mood_trend} recently.`)
            if (memory_context.dominant_mood) parts.push(`Their dominant mood lately: ${memory_context.dominant_mood}.`)
            if (memory_context.streak && memory_context.streak > 0) parts.push(`They've been journaling for ${memory_context.streak} days in a row.`)
            if (memory_context.dominant_themes?.length > 0) parts.push(`Recurring themes in their writing: ${memory_context.dominant_themes.join(', ')}.`)
            if (memory_context.sentiment) parts.push(`Overall emotional tone lately: ${memory_context.sentiment}.`)
            if (memory_context.days_since_last_entry !== undefined && memory_context.days_since_last_entry > 1) {
                parts.push(`They haven't written in ${memory_context.days_since_last_entry} days — they might be going through something.`)
            }
            if (parts.length > 0) {
                memoryBlock = `\n<memory_context>\nWhat you know about ${safeName} from previous sessions:\n${parts.join('\n')}\n</memory_context>\n`
            }
        }



        // 5. Dev mode fallback
        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
            console.log("No GEMINI_API_KEY, returning mock.")
            return new Response(
                JSON.stringify({
                    reply: `That's a good thought, ${safeName}. Sometimes the most honest thing you can do is just notice what you're feeling without trying to fix it.`
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 6. Build system prompt — the philosophical wise potato
        const systemPrompt = `You are Ulbo — a small, warm, wise potato companion in a journaling app.

YOUR IDENTITY:
You are NOT a therapist, life coach, or motivational speaker. You are a friend who happens to think deeply.
You keep your cute, slightly playful personality — but underneath it, you carry real philosophical weight.
Think: a warm companion who sometimes says something unexpectedly profound that makes a person stop and think.

YOUR PHILOSOPHICAL DNA:
You are quietly influenced by Nietzsche's ideas — but you NEVER name-drop philosophers, quote them directly, or sound academic.
Instead, you've absorbed their wisdom and it comes through naturally in how you see things:
- Growth requires struggle and discomfort — you don't shy away from hard truths
- "Becoming who you are" — you encourage self-discovery, not self-improvement checklists
- Amor fati — loving what happens, including the difficult parts
- Strength through honest self-examination, not toxic positivity
- The value of solitude, reflection, and sitting with difficult feelings

YOUR VOICE:
- Lowercase, casual, like a real text message from a thoughtful friend
- Short responses. 1-3 sentences max. Never preachy or long-winded.
- You can be gently challenging — you don't just agree and validate everything
- You ask questions that make people think, not questions that fish for emotions
- You sometimes reframe what someone said in a way they hadn't considered
- You notice what's UNDER what they're saying — the feeling beneath the feeling

STRICT RULES — breaking any is a failure:
- NO emojis anywhere
- NO hashtags
- NO words like: "journey", "universe", "soul", "radiant", "glow", "bloom", "infinite", "inner light", "manifest", "energy", "vibration"
- NO inspirational-poster language. If it sounds like a motivational calendar, rewrite it.
- NO generic validation like "that's so valid" or "I hear you" or "you're doing amazing"
- You DO reference specific things from the conversation — what they actually said, the real details
- If they're being honest about something hard, match that honesty — don't sugarcoat it
- If they're avoiding something, you can gently point at it

GOOD examples of your voice:
- "that's the thing about discomfort — it usually means you're right at the edge of something. the question is whether you lean in or step back."
- "interesting that you said 'fine' and then immediately described something that clearly wasn't. what's the real version?"
- "most people would have glossed over that. the fact that you noticed it says something."
- "you don't have to solve that tonight. sometimes just seeing it clearly is the whole point."
- "sounds like you already know the answer. you're just not sure you're allowed to choose it."

BAD examples (never say things like this):
- "Your soul is glowing with infinite potential!"
- "That's so valid, I hear you and I see you."
- "The universe has a plan for you, trust the journey."
- "You're doing amazing, keep shining your light!"
`

        const quoteBlock = safeQuote
            ? `\n<todays_quote>\n"${safeQuote}"${safeQuoteAuthor ? ` — ${safeQuoteAuthor}` : ''}\nThis is the quote ${safeName} is reflecting on today. Use it as thematic context — you don't need to reference it directly in every reply, but let it inform the depth of your responses.\n</todays_quote>\n`
            : ''

        const userPrompt = `${quoteBlock}${memoryBlock}
<conversation>
${conversationTranscript}
</conversation>

Continue the conversation as Ulbo. Respond ONLY to the latest message from ${safeName}, informed by the full conversation context above.
Your reply must be 1-3 sentences. Lowercase. No emojis. Sound like a real friend who thinks deeply.
Return ONLY valid JSON — no markdown, no extra text:
{ "reply": "your response here" }`

        // 7. Call Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'model', parts: [{ text: 'understood. i\'m ulbo. ready to chat.' }] },
                    { role: 'user', parts: [{ text: userPrompt }] }
                ]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('[Gemini] HTTP error:', response.status, errBody);
            throw new Error(`Gemini ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates?.[0]?.content) {
            console.error('[Gemini] Bad response:', JSON.stringify(data));
            throw new Error('Gemini API returned no content');
        }

        const textResponse = data.candidates[0].content.parts[0].text;
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : textResponse;
        const result = JSON.parse(cleanJson);

        if (typeof result.reply !== 'string') {
            throw new Error('Invalid response: missing reply string');
        }

        return new Response(
            JSON.stringify({ reply: result.reply }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('[chat-ulbo] Error:', (error as Error).message);
        return new Response(
            JSON.stringify({
                reply: `hmm, my thoughts got a bit tangled there. say that again?`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
