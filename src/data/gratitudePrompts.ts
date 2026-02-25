
import { MascotMood } from "../hooks/useMascotState";

export type PromptCategory =
    | 'Micro Moments'
    | 'People'
    | 'Body'
    | 'Contrast & Noticing'
    | 'Growth & Becoming'
    | 'Place & Environment'
    | 'Unexpected & Reframed';

export interface GratitudePrompt {
    id: string;
    text: string;
    category: PromptCategory;
    timeEstimate: '2 min' | '5 min' | 'open-ended';
    allowedMoods?: MascotMood[]; // If undefined, allowed for all
    excludedMoods?: MascotMood[];
    minJournalEntries?: number; // For "Unexpected" category
}

export const PROMPTS: GratitudePrompt[] = [
    // CATEGORY 1 — Micro Moments
    {
        id: 'micro_1',
        text: "Describe one moment from today in so much detail that someone who wasn't there could feel it.",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_2',
        text: "What's the smallest thing that went right today? Write about it like it mattered — because it did.",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_3',
        text: "What did u do today that felt easy? What made it easy?",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_4',
        text: "There was probably a moment today that u almost didn't notice. What was it?",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_5',
        text: "Write about a sound, smell, or feeling from today that u want to remember.",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_6',
        text: "What's something that happened in the last 24 hours that u're glad happened, even a little bit?",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_7',
        text: "Describe ur morning in slow motion. Where does gratitude show up in the details?",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_8',
        text: "What's something small that someone did for u recently, even if they didn't mean it as a big deal?",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_9',
        text: "Write about something ordinary that u'd miss if it was gone.",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },
    {
        id: 'micro_10',
        text: "What moment today made u exhale?",
        category: 'Micro Moments',
        timeEstimate: '2 min',
    },

    // CATEGORY 2 — People
    {
        id: 'people_1',
        text: "Think of one person who makes ur life better just by existing. Don't write their name — write what they do. The specific things.",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_2',
        text: "Who said something recently that stuck with u, even a little? What was it? Why did it land?",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_3',
        text: "Write about a time someone showed up for u without being asked to.",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_4',
        text: "Is there someone u haven't thanked? Write what u would say if u did.",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_5',
        text: "Think of someone who taught u something without knowing they were teaching u. What did u learn?",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_6',
        text: "Who makes u feel like urself? What do they do that makes that happen?",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_7',
        text: "Write about a stranger who made ur day slightly better. What happened?",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_8',
        text: "Think of a person from ur past who shaped something good in u. What did they give u?",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_9',
        text: "Who do u feel most like urself around? What does that feel like in ur body?",
        category: 'People',
        timeEstimate: '5 min',
    },
    {
        id: 'people_10',
        text: "Write a thank-you that will never be sent. Say everything.",
        category: 'People',
        timeEstimate: '5 min',
    },

    // CATEGORY 3 — The Body (Max once/week)
    {
        id: 'body_1',
        text: "What did ur body do today that u didn't thank it for?",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_2',
        text: "Write about a physical sensation from today that felt good — even briefly. Describe it slowly.",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_3',
        text: "What has ur body carried lately that deserves acknowledgment?",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_4',
        text: "Think of something ur body can do that u take for granted. Write about what life would look like without it.",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_5',
        text: "When did ur body feel most at home today — comfortable, warm, held, rested?",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_6',
        text: "What does rest feel like in ur body? When did u last have it?",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_7',
        text: "Write about a time ur body surprised u with its strength.",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_8',
        text: "What physical thing do u do every day that ur body makes possible? Write about it like it's a gift.",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_9',
        text: "Is there a part of ur body u've been hard on lately? What would it say if it could write back?",
        category: 'Body',
        timeEstimate: '5 min',
    },
    {
        id: 'body_10',
        text: "Write about a moment ur body felt good. Not looked good — felt good.",
        category: 'Body',
        timeEstimate: '5 min',
    },

    // CATEGORY 4 — Contrast & Noticing (Avoid sad/anxious)
    {
        id: 'contrast_1',
        text: "What would today have looked like if one good thing hadn't happened? What was that good thing?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_2',
        text: "Pick something in ur life that used to be harder. How has it changed?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_3',
        text: "What do u have access to today that ur past self would be amazed by?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_4',
        text: "What problem do u no longer have that u used to? What solved it?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_5',
        text: "Think about where u were a year ago. What's different now that's better, even slightly?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_6',
        text: "What's something in ur life that used to feel impossible that now feels normal?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_7',
        text: "If today was ur last ordinary day, what would u notice about it?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_8',
        text: "Write about something u have that u know not everyone does. How does that land?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_9',
        text: "What would ur life look like without ur most reliable comfort? What is that comfort?",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },
    {
        id: 'contrast_10',
        text: "Write about a difficulty from ur past that gave u something u now value.",
        category: 'Contrast & Noticing',
        timeEstimate: 'open-ended',
        excludedMoods: ['sad', 'anxious'],
    },

    // CATEGORY 5 — Growth & Becoming (Avoid tired)
    {
        id: 'growth_1',
        text: "What's something u can do now that u couldn't do — or wouldn't do — a year ago?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_2',
        text: "What's a belief u've let go of that was holding u back? When did that start to shift?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_3',
        text: "What hard thing have u survived that made u more of urself?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_4',
        text: "Write about a moment u surprised urself. What happened?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_5',
        text: "What's something u used to need externally that u can now give urself?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_6',
        text: "What quality do u have that has helped u more than u've acknowledged?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_7',
        text: "Think of a mistake that taught u something u now rely on. What was the lesson?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_8',
        text: "What's something u did recently that took courage — even small courage?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_9',
        text: "Write about a version of urself u've grown out of. What do u want to say to them?",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },
    {
        id: 'growth_10',
        text: "What are u becoming? Write about it like it's already true.",
        category: 'Growth & Becoming',
        timeEstimate: '5 min',
        excludedMoods: ['tired'],
    },

    // CATEGORY 6 — Place & Environment
    {
        id: 'place_1',
        text: "Describe the space ur in right now like it's the first time u've seen it. What's actually here?",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_2',
        text: "What's the light like where u are? Write about it.",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_3',
        text: "What's ur favourite thing about where u live — not the big stuff, the small stuff?",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_4',
        text: "Write about a place that has made u feel safe. What made it feel that way?",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_5',
        text: "What's something about ur environment right now that ur body is grateful for?",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_6',
        text: "Think about a place ur looking forward to being. Describe it. Why does it matter?",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_7',
        text: "What's the last natural thing u noticed — sky, plant, animal, weather? Describe it slowly.",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_8',
        text: "Write about a room that holds a good memory. What's in it?",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_9',
        text: "What's something about the season ur in — literal or emotional — that has something to offer?",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },
    {
        id: 'place_10',
        text: "Where do u feel most like urself? Write about what that place gives u.",
        category: 'Place & Environment',
        timeEstimate: '2 min',
    },

    // CATEGORY 7 — Unexpected & Reframed (Require 7+ days)
    {
        id: 'unexpected_1',
        text: "Write about something that frustrated u today. Is there anything in it that was, unexpectedly, ok?",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_2',
        text: "What's something ur grateful for that u'd be embarrassed to admit?",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_3',
        text: "What's a 'bad' habit or 'flaw' that has actually served u somehow?",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_4',
        text: "Write about something that didn't go the way u wanted. What happened instead?",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_5',
        text: "What's a worry u have right now that, if u squint, shows u something u care about?",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_6',
        text: "Think of something ur dreading. What does the dread tell u about what matters to u?",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_7',
        text: "Write about a cancelled plan, a missed opportunity, or a failure — and find the one thing in it.",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_8',
        text: "What's something u used to want that ur glad u didn't get?",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_9',
        text: "Write about a limitation — physical, circumstantial, personal — that has shaped something good.",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
    {
        id: 'unexpected_10',
        text: "What's something u've been resisting that might actually be on ur side?",
        category: 'Unexpected & Reframed',
        timeEstimate: 'open-ended',
        minJournalEntries: 7,
    },
];

export const HUNT_PLACEHOLDERS = [
    "A delicious meal you ate...",
    "A kind text you received...",
    "A song that improved your mood...",
    "A quiet moment you enjoyed...",
    "A task you finally finished...",
    "Something beautiful you saw...",
    "A person who helped you...",
    "A comfortable feeling...",
    "Something that made you laugh...",
    "A new thing you learned...",
    "A warm drink...",
    "The weather today...",
    "A nice smell...",
    "Someone you're glad to know...",
    "A memory that popped up...",
    "Something easy that happened...",
    "A feeling of relief...",
    "Your favorite part of the day...",
    "Something you're looking forward to...",
    "A small win...",
];
