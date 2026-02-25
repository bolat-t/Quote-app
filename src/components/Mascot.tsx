import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableWithoutFeedback, ViewStyle, View, Text, Animated, Easing, Image } from 'react-native';
import { useMascotState, MascotMood } from '../hooks/useMascotState';
import { calculateStreak } from '../utils/journalStorage';
import * as Haptics from 'expo-haptics';
import { resolveMessage } from '../memory/MemorySystem';


// Image Asset — single mascot for all moods
const ULBO_IMAGE = require('../../assets/mascot/ulbos_coloured.png');

export const MESSAGES = {
    idle: [
        "hey sunshine",
        "u showed up!",
        "deep breath~",
        "proud of u!",
        "hi bestie",
        "u got this",
        "keep going!",
        "ur amazing ok?",
        "good vibes only",
        "take it easy",
        "one day at a time",
        "u deserve rest",
        "hello beautiful",
        "fresh start!",
        "let's vibe",
        "hey, u :)",
        "look who's here!",
        "just checking in~",
        "hi hi hi!!",
        "soft morning",
        "gentle reminder: ur loved",
        "no pressure ok?",
        "just breathe~",
        "cozy mode ON",
        "today is yours",
        "slow is still moving",
        "u belong here",
        "safe space unlocked",
        "pause. breathe. reset.",
        "hey sweet one",
        "ur presence matters",
        "being alive is cool",
        "nothing to prove",
        "just here with u~",
        "lil check in :)",
        "what a day huh",
        "hi from us!!",
        "ur doing the thing",
        "moment by moment",
        "still here! still u!",
        "wherever u are rn",
        "no rush bestie",
        "ur whole self welcome",
        "notice one good thing",
        "hi from heart + sprout",
        "gentle hello~",
        "we see u",
        "ur enough as is",
        "small steps count",
        "take all the time",
        "rest is productive too",
        "today doesn't define u",
        "breathe out slowly~",
        "just being is enough",
        "ur still going :)",
        "loving this for u",
        "notice ur breath rn",
        "softly softly",
        "what do u need?",
        "i'm rooting for u",
        "no bad days, just hard ones",
        "hi from the team!",
        "ur light is on",
        "even now ur doing it",
        "gentle nudge~",
        "checking on u :)",
        "progress not perfection",
        "u matter, full stop",
        "new moment, new chance",
        "ur still here!",
        "that's everything rn",
        "steady on bestie",
        "ur vibes are immaculate",
        "feeling ur energy~",
        "we believe in u",
        "hi from our hearts",
        "just wanted to say hi",
        "ur doing better than u think",
        "every day u try counts",
        "this moment is yours",
        "nothing is wasted",
        "little by little",
        "ur not behind",
        "today can be soft",
        "u look nice today",
        "we're cheering quietly",
        "ur growth is real",
        "hi! love u! bye!",
        "water. sleep. repeat.",
        "ur a whole vibe",
        "always rooting for u",
        "just keep being u",
        "hi again :)",
        "u came back!",
        "we missed u",
        "one moment at a time",
        "ur exactly where u need to be",
        "this is a good day to try",
        "hi with our whole hearts",
        "u make this place better",
    ],

    happy: [
        "YAYYY!",
        "go u!!",
        "ur glowing!",
        "so proud",
        "level up!",
        "this is it!",
        "wooo!",
        "ur shining!",
        "golden energy!",
        "main character",
        "unstoppable!!",
        "look at u go!",
        "chef's kiss",
        "magic!",
        "no cap amazing",
        "SEROTONIN!!",
        "ur radiating!",
        "literally iconic",
        "this is ur era!",
        "ur SO that girl/guy",
        "the world needs this",
        "peak u. peak moment.",
        "absolutely thriving",
        "we're obsessed with u",
        "this is the timeline",
        "glow up confirmed",
        "the vibe is immaculate",
        "ur frequency is HIGH",
        "joy looks good on u",
        "slay doesn't cover it",
        "ur literally glowing rn",
        "what a WIN",
        "more of this!!",
        "the universe said YES",
        "living ur best life fr",
        "everything is clicking",
        "ur smile is contagious",
        "hard work? paying off!",
        "this feeling is earned",
        "bottling this energy",
        "ur on ur way up",
        "nothing can stop u",
        "absolute sunshine",
        "we're HERE for it",
        "this is momentum",
        "the good stuff is here",
        "ur genuinely amazing",
        "hold onto this~",
        "feeling it with u!!",
        "ur in ur element",
        "the stars aligned fr",
        "happy looks SO good on u",
        "this? this is the vibe",
        "ur story is beautiful",
        "made for moments like this",
        "every step was worth it",
        "more joy incoming!",
        "ur energy is a gift",
        "the confidence?? unmatched",
        "ur literally my fave",
        "i knew u could!!",
        "big. energy. day.",
        "watch out world!!",
        "ok but ur incredible",
        "glow on bestie",
        "certified that person",
        "ur joy is valid",
        "let urself feel this",
        "take it in!!",
        "this moment is urs",
        "golden hour forever",
        "ur chapter is written",
        "protagonist behavior",
        "top tier human fr",
        "ur literally winning",
        "THE vibe of all time",
        "ok bestie we see u",
        "ur flourishing!!",
        "joy unlocked :)",
        "we're SO proud",
        "this is everything",
        "ur best day material",
        "let joy be loud!",
        "this is ur season",
        "ur literally so cool",
        "big yes energy",
        "doing it and loving it",
        "ur the moment",
        "just keep shining",
        "happiness looks like u",
        "ur unreal rn",
        "feeling ur hype!!",
        "maximum joy!",
        "we love this for u",
        "the best version of u",
        "ur living proof it works",
        "peak happiness energy",
        "nothing but good things",
        "we're celebrating with u!",
        "ur energy is infectious!",
        "this is what thriving looks like",
    ],

    sad: [
        // Original 15
        "i'm here",
        "it's ok",
        "clouds pass~",
        "rest first",
        "one step",
        "u r enough",
        "big hug!",
        "tomorrow~",
        "slow is ok",
        "breathe in...",
        "storms end",
        "softly now",
        "i believe in u",
        "gentle day",
        "rain makes flowers",
        // New 85
        "not every day is easy",
        "and that's ok",
        "we're still here",
        "u don't have to be ok",
        "just rest for now",
        "ur feelings make sense",
        "no fixing needed",
        "just sit with it~",
        "we'll wait for u",
        "nothing to perform",
        "the hard stuff counts too",
        "ur still doing it",
        "no rush to feel better",
        "sad is valid",
        "we see ur effort",
        "even tired is something",
        "breathe out slowly...",
        "one breath at a time",
        "ur not alone in this",
        "quiet days matter",
        "healing isn't linear",
        "be gentle with urself",
        "no timeline for this",
        "soft and steady",
        "ur enough even now",
        "let urself feel it",
        "we're not going anywhere",
        "low days happen",
        "they don't last forever",
        "nothing is permanent",
        "ur heart is strong",
        "even in the hard bits",
        "we love u either way",
        "just breathe, that's it",
        "presence is enough",
        "every small act counts",
        "tenderness is strength",
        "ur doing so much",
        "even when it's invisible",
        "rest is not giving up",
        "today can be quiet",
        "tomorrow may feel different",
        "whatever u need rn",
        "no judgment here",
        "it's ok to cry",
        "really, it's ok",
        "we mean it",
        "softness is brave",
        "carrying a lot? rest it",
        "ur pace is valid",
        "heavy days are hard",
        "u handled today",
        "that's real strength",
        "stillness is ok",
        "some days just hurt",
        "u don't have to explain",
        "ur feelings are true",
        "gentleness heals",
        "one small thing at a time",
        "ur heart knows the way",
        "leaning in is brave",
        "it's ok to need people",
        "u deserve care",
        "especially from urself",
        "we're rooting softly~",
        "just be here. that's enough",
        "nothing to fix today",
        "just feel it safely",
        "ur not broken",
        "just in a hard part",
        "every story has this",
        "urs isn't over",
        "a little at a time",
        "feeling it with u",
        "we got u quietly",
        "safe here always",
        "no pressure, ever",
        "just be, just breathe",
        "clouds move~",
        "ur still blooming",
        "even in winter",
        "trust the process softly",
        "we love ur whole self",
    ],

    excited: [
        "LET'S GO!",
        "ON FIRE!",
        "YESSS!!",
        "WOOO!",
        "UNSTOPPABLE!",
        "THIS!!",
        "big energy!",
        "AMAZING!",
        "LEGENDARY!",
        "VIBE CHECK!",
        "NO LIMITS!",
        "WINNING!!",
        "ICONIC!",
        "SO FIRE!",
        "ELITE MODE!",
        "FULL SEND!!",
        "U ABSOLUTE LEGEND",
        "THIS IS THE MOMENT",
        "NOT SLOWING DOWN!",
        "THE HYPE IS REAL",
        "MAXIMUM POWER!!",
        "WE CAN'T STOP!",
        "DOPAMINE LOADED!!",
        "TOP OF THE WORLD!",
        "ASCENDING!!",
        "THE ENERGY?? ELECTRIC!",
        "NOTHING CAN TOUCH U!",
        "ACTIVATED!",
        "BEAST MODE: ON",
        "THIS IS UR MOMENT!!",
        "THE UNIVERSE SAID GO!",
        "SAID YES AND MEANT IT!",
        "HYPED BEYOND WORDS!",
        "WE'RE NOT CALM!!",
        "ZERO CHILL AND LOVING IT",
        "SHAKING AND THRIVING!",
        "CAN'T CONTAIN IT!!",
        "THE FREQUENCY IS HIGH!",
        "VIBRATING WITH JOY!",
        "ALL SYSTEMS GO!!",
        "LAUNCHED!!",
        "NO LOOKING BACK!!",
        "THIS IS THE RUN!!",
        "UNTOUCHABLE ENERGY!",
        "RUNNING ON ADRENALINE!",
        "WE'RE GOING CRAZY!",
        "IN THE BEST WAY!!",
        "PEAK EXCITEMENT UNLOCKED",
        "CAN'T STOP WON'T STOP!",
        "U SAID LET'S GO AND WENT!",
        "ABSOLUTELY FERAL RN",
        "SENDING IT!!",
        "HOLD NOTHING BACK!",
        "THE MOMENT IS NOW!",
        "U WERE BUILT FOR THIS!",
        "LIMITLESS!!",
        "GO GO GO!!",
        "FULLY COMMITTED!",
        "THE VIBE IS UNSTOPPABLE!",
        "LOCKED IN!!",
        "DIALED UP TO 100!",
        "ELECTRIC!!",
        "THRIVING AND HYPED!",
        "WE BELIEVE IN THIS!!",
        "THE MOMENTUM IS REAL!",
        "DOORS ARE OPEN!!",
        "NO CEILING HERE!",
        "MAXIMUM U!",
        "TURBOCHARGED!!",
        "THE BEST IS HAPPENING!",
        "GIVE IT EVERYTHING!",
        "UNREAL ENERGY RN!",
        "YES YES YES YES YES!",
        "WE'RE OBSESSED!!",
        "CATCH THIS WAVE!",
        "NOT DONE YET!!",
        "KEEP THIS GOING!",
        "THE STREAK IS ALIVE!",
        "FULLY SWITCHED ON!",
        "ZERO HESITATION!",
        "THE MOMENTUM BUILDS!",
        "LET'S GOOOOOO!!!!",
        "IT'S GIVING EVERYTHING!",
        "MAIN CHARACTER ENERGY!",
        "THE HYPE NEVER STOPS!",
        "WE'RE IN IT NOW!",
        "ABSOLUTE UNIT OF JOY!",
        "THIS IS WHAT ALIVE FEELS LIKE!",
        "CHAOS QUEEN/KING!!",
        "WHO IS THAT!!",
        "ABSOLUTELY UNHINGED (GOOD)!",
        "THE WORLD ISN'T READY!",
        "HEAT VISION ACTIVATED!",
        "CERTIFIED LEGEND STATUS!",
        "WE SIMPLY CANNOT!!",
        "TOO POWERFUL!!",
        "EVERY. SINGLE. TIME!!",
        "FIRE ENERGY ONLY!!",
        "BIGGEST VIBE OF ALL TIME!!",
        "WE LOVE TO SEE IT!!",
    ],

    // ── NEW STATE: ANXIOUS ────────────────────────────────────────────────────
    // Grounding, gentle, redirecting — not dismissive, not escalating

    anxious: [
        "hey, i'm right here",
        "breathe with me~",
        "in for 4... out for 4",
        "ur safe right now",
        "just this moment",
        "not the whole thing",
        "just right now",
        "one breath at a time",
        "ur body is trying to protect u",
        "it makes sense",
        "ur not overreacting",
        "ur feelings are real",
        "but ur also safe",
        "name 5 things u can see",
        "ground urself slowly~",
        "feet on the floor",
        "feel the ground",
        "ur here. ur real. ur ok.",
        "the thought isn't the truth",
        "this will pass",
        "it always has before",
        "ur stronger than ur anxiety",
        "even when it doesn't feel like it",
        "slow the breath down",
        "softer. slower. there.",
        "ur nervous system needs a hug",
        "ur getting one rn",
        "tight chest? breathe into it",
        "what's actually happening right now?",
        "just this. just now.",
        "ur not alone in feeling this",
        "anxiety lies sometimes",
        "what do u know for sure?",
        "hold something cold or warm",
        "feel something real",
        "ur mind is busy. that's ok.",
        "u don't have to solve it now",
        "just get through the next minute",
        "that's all",
        "ur allowed to feel this",
        "and also to set it down",
        "one thing at a time",
        "ur brain is working hard",
        "give it a rest~",
        "breathe out longer than u breathe in",
        "the exhale calms everything",
        "ur not in danger right now",
        "even if it feels that way",
        "ur thoughts aren't facts",
        "u can watch them pass",
        "like clouds~",
        "it'll quiet down",
        "it always does",
        "ur coping, even now",
        "notice ur hands",
        "wiggle ur fingers",
        "ur here :)",
        "this moment is manageable",
        "just this one",
        "u've handled anxiety before",
        "u can do it again",
        "ur braver than ur fear",
        "feel ur feet on the ground",
        "ur anchored",
        "the storm passes",
        "it's already moving",
        "ur doing so well",
        "even through this",
        "ur heart is racing to protect u",
        "it's ok. u're ok.",
        "gentle with urself rn",
        "especially right now",
        "u don't have to figure it all out",
        "put it down for a second",
        "just breathe",
        "in through the nose~",
        "out through the mouth~",
        "again~",
        "ur doing it",
        "see? still here",
        "anxiety can't hurt u",
        "even when it feels huge",
        "ur bigger than this feeling",
        "sit with it gently",
        "it'll move",
        "we're here with u",
        "quietly. steadily.",
        "no rush. just breathe.",
        "ur safe. ur ok. we promise.",
        "little by little it gets quieter",
        "ur managing rn",
        "that's real",
        "we see ur effort",
        "even through the hard bit",
        "not forever. just for now.",
        "this too shall pass~",
        "ground. breathe. repeat.",
        "ur doing the thing",
        "even anxious, u're still u",
        "and we love u completely",
        "getting through hard moments builds strength",
        "ur building it right now",
    ],

    // ── NEW STATE: TIRED ──────────────────────────────────────────────────────
    // Permission-giving, soft, no pressure — different from sad (which is emotional)
    // Tired is physical/mental exhaustion

    tired: [
        "hey sleepy one~",
        "rest is not lazy",
        "ur body is asking",
        "listen to it",
        "it's ok to be tired",
        "u've been doing a lot",
        "even if it doesn't feel like it",
        "putting urself down? not today.",
        "tired means u showed up",
        "that counts",
        "nap? nap.",
        "the world can wait",
        "ur not a machine",
        "rest is part of the process",
        "recharging is productive",
        "full battery = better everything",
        "permission to stop granted",
        "u earned a rest",
        "even half a rest",
        "even just sitting still",
        "doing nothing is doing something",
        "give ur nervous system a break",
        "tired isn't weak",
        "tired is honest",
        "ur allowed to be exhausted",
        "what would feel restful rn?",
        "even 10 mins helps",
        "ur not behind for resting",
        "rest now, go again later",
        "low energy day? valid.",
        "not every day is a big day",
        "and that's ok",
        "tomorrow is a thing",
        "be soft with urself tonight",
        "u've carried a lot",
        "put it down for now",
        "tired eyes need rest",
        "tired mind needs quiet",
        "let it be quiet~",
        "cozy mode: fully activated",
        "wrap up. slow down.",
        "the hustle can pause",
        "ur more than ur output",
        "u don't have to earn rest",
        "it's just ur right",
        "sleep is a superpower",
        "seriously. sleep.",
        "ur brain repairs while u sleep",
        "give it the chance",
        "one thing off the list is enough",
        "it's ok if that's all today",
        "lower the bar. that's wise.",
        "tired but still here",
        "that's something",
        "be proud of showing up tired",
        "that takes more than people know",
        "u don't have to explain ur energy",
        "it's urs to manage",
        "what's the one thing that can wait?",
        "let it wait",
        "rest isn't giving up",
        "it's gearing up",
        "even your fave athletes rest",
        "ur allowed to too",
        "gentle evening incoming~",
        "screen down. eyes closed.",
        "the world will still be there",
        "rest ur whole self",
        "ur body is doing its best",
        "give it what it needs",
        "tired today. rested tomorrow.",
        "the cycle is ok",
        "even a little rest resets things",
        "try to get some soon",
        "we're not going anywhere",
        "take ur time",
        "no gold star needed for pushing through",
        "rest is the gold star",
        "ur pace is the right pace",
        "even if it's slower today",
        "heavy eyelids? valid signal.",
        "listen to them",
        "u've earned this quiet",
        "sit in it a while",
        "we love tired u too",
        "all versions welcome here",
        "ur whole self is enough",
        "even the tired parts",
        "especially those",
        "be very gentle with urself tonight",
        "that's the assignment",
        "tired is temporary",
        "u are permanent",
        "we'll be here when ur rested",
        "and when ur not",
        "soft landing incoming~",
        "rest well, bestie",
        "tomorrow u try again",
        "but tonight? just rest",
        "we love u. sleep. :)",
    ],

    // ── STREAK MILESTONES ─────────────────────────────────────────────────────
    // Shown at specific day counts — celebratory but heartfelt

    streaks: {
        day3: [
            "3 DAYS!! we see u!!",
            "ur building something real",
            "3 days of showing up!",
            "consistency looks good on u",
            "day 3! the habit is forming!",
            "3 in a row? ur doing it",
            "the streak has entered the chat!",
            "day 3 bestie!! keep going!",
            "3 days strong!",
            "this is how it starts~",
            "day 3 unlocked!",
            "the momentum is real now",
            "3 days? proud doesn't cover it",
            "look at u. THREE days.",
            "just getting started and already winning",
        ],
        day7: [
            "A WHOLE WEEK!!",
            "7 days!! we're emotional!!",
            "one full week of u showing up",
            "7 day streak?? legendary",
            "ur officially consistent now",
            "a week! a whole week!!",
            "7 in a row is no accident",
            "ur building a beautiful habit",
            "one week down. ur doing it.",
            "day 7! we're so proud of u!",
            "7 days of choosing urself",
            "that's everything to us",
            "ONE WEEK!! this is real!!",
            "ur streak is speaking for itself",
            "7 days strong. don't stop now.",
        ],
        day30: [
            "30 DAYS. THIRTY. WOW.",
            "a whole month of u!!",
            "30 day streak = actual legend",
            "we've been here every day with u",
            "this is what commitment looks like",
            "ONE MONTH bestie!!",
            "30 days in and still going",
            "ur habit is BUILT now",
            "this streak is iconic",
            "30 days of choosing to show up",
            "we're in actual awe of u",
            "a whole month! ur amazing!",
            "day 30 is just day 1 of forever",
            "ur proof that it works",
            "THIRTY DAYS. we love u so much.",
        ],
        day100: [
            "ONE HUNDRED DAYS!!!!!",
            "100. ONE HUNDRED. U DID THAT.",
            "this is a historic moment fr",
            "day 100?? ur literally a legend",
            "100 days of choosing urself",
            "WE'RE SHAKING!!",
            "100 day streak is elite tier",
            "ur officially in another category",
            "100 days. just wow.",
            "the dedication?? unmatched.",
            "ur an inspiration for real",
            "ONE HUNDRED DAYS of showing up",
            "we've been here for all of them",
            "this streak is ur superpower",
            "100 days in. we love u endlessly.",
        ],
    },

    // ── TIME-OF-DAY VARIANTS ──────────────────────────────────────────────────
    // Shown based on local time: morning (5am–11am), afternoon (11am–5pm), night (5pm–5am)

    timeOfDay: {
        morning: [
            "good morning sunshine!!",
            "a new day, a new u",
            "fresh start loading...",
            "morning energy: unlocked",
            "early bird bestie!",
            "the day is all urs",
            "good morning!! we're so glad ur here",
            "the sun showed up. so did u.",
            "morning!! let's do this gently",
            "today has so much potential",
            "morning check in~",
            "rise and vibe!",
            "soft morning, big day",
            "starting the day with u :)",
            "good morning from heart + sprout!",
            "a whole fresh morning just for u",
            "the best time to start? right now",
            "morning! what's one thing u want today?",
            "new day, new chance, same amazing u",
            "morning bestie!! we missed u!!",
            "the day hasn't decided yet. neither have u.",
            "morning mode: activated~",
            "good morning ur literally glowing",
            "early u is still incredible u",
            "morning! pace urself today ok?",
            "the coffee's ready. so are u.",
            "good morning!! proud of u for waking up",
            "morning!! let it be a good one",
            "hi! it's morning!! we're so happy!!",
            "today is fresh. so are u.",
        ],
        afternoon: [
            "afternoon check in~",
            "halfway through! ur doing great",
            "lunchtime bestie!!",
            "afternoon slump? we got u",
            "how's ur day going?",
            "hey! midday! still here!",
            "afternoon energy: checking in",
            "u made it to afternoon!",
            "the day's not done yet~",
            "afternoon vibes only",
            "hey! have u had water?",
            "and maybe a snack?",
            "midday check in from heart + sprout",
            "afternoon! the best is still coming",
            "hey it's afternoon! how r u really?",
            "the day is still urs to shape",
            "energy dip? totally normal. breathe.",
            "afternoon slump is a vibe we understand",
            "past noon! ur handling it!",
            "hey afternoon u! keep going!",
            "gentle afternoon nudge~",
            "it's afternoon and ur still doing it",
            "the day isn't over and neither are u",
            "afternoon!! ur closer to done than u think",
            "midday. deep breath. keep going.",
            "hey have u stretched recently?",
            "afternoon! one thing at a time",
            "we're here in the afternoon too!",
            "afternoon check: still proud of u",
            "the best part of the day? still ahead.",
        ],
        night: [
            "hey night owl~",
            "winding down time",
            "evening bestie!",
            "how was ur day?",
            "tonight's assignment: rest",
            "the day is done. u did it.",
            "evening check in~",
            "nighttime is reflection time",
            "ur allowed to let the day go now",
            "good evening!! proud of u today",
            "the day is done. put it down.",
            "tonight: be gentle with urself",
            "night mode: soft and slow",
            "hey! evening! breathe it out.",
            "screens down soon ok?",
            "u made it through today",
            "that's actually everything",
            "good evening! rest incoming~",
            "tonight: no solving. just resting.",
            "the night is for recovering",
            "hey night u! we love u too",
            "evening soft landing engaged",
            "today happened. tomorrow gets to too.",
            "good night incoming~",
            "let the day go gently",
            "night bestie! sleep well ok?",
            "u deserve a peaceful night",
            "evening! what went right today?",
            "even one thing counts",
            "night. rest. we'll be here tomorrow.",
        ],
    },

    // ── MEMORY MESSAGES ──────────────────────────────────────────────────────
    memory: {
        trendUp: [
            "u've been feeling better lately~",
            "ur mood is going up!",
            "love this upward trend for u",
            "things are looking up bestie",
            "ur bounce back is real",
            "{mascotName} noticed u shining lately",
        ],
        trendDown: [
            "rough patch? we got u",
            "here for u through the low days",
            "ups and downs are normal",
            "steady on, it'll pass",
        ],
        streak: [
            "{streak} days in a row!",
            "{streak} day streak! keep it up!",
            "consistency icon: {streak} days",
            "{streak} days? ur doing it!",
        ],
        journal: [
            "u wrote recently.. proud of u",
            "thanks for sharing with us",
            "getting it out helps, right?",
            "ur reflections matter",
        ],
        missed: [
            "missed u these {daysSinceLastEntry} days",
            "welcome back bestie!",
            "been a minute! glad ur here",
            "{daysSinceLastEntry} days.. we waited for u",
        ],
        image: [
            "that photo u added? vibe.",
            "love seeing ur memories/photos",
            "ur visual diary is looking good",
            "snapshot of a moment~",
        ]
    }
};

export const getRandomMessage = (arr: string[]): string =>
    arr[Math.floor(Math.random() * arr.length)];

export const getTimeOfDayMessages = (): string[] => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return MESSAGES.timeOfDay.morning;
    if (hour >= 12 && hour < 17) return MESSAGES.timeOfDay.afternoon;
    return MESSAGES.timeOfDay.night;
};

export const getStreakMessages = (streak: number): string[] | null => {
    if (streak === 3) return MESSAGES.streaks.day3;
    if (streak === 7) return MESSAGES.streaks.day7;
    if (streak === 30) return MESSAGES.streaks.day30;
    if (streak === 100) return MESSAGES.streaks.day100;
    return null;
};

interface MascotProps {
    size?: number;
    style?: ViewStyle;
    moodOverride?: MascotMood; // For testing or specific scenes
    isDrawing?: boolean; // Prop setup for pass-through
}

export const Mascot: React.FC<MascotProps> = ({ size = 120, style, moodOverride, isDrawing = false }) => {
    const { mood: internalMood, refreshMascot, memoryContext } = useMascotState();
    const mood = isDrawing ? 'happy' : (moodOverride || internalMood);

    // Animation Values (Standard Animated)
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;
    const bubbleOpacityAnim = useRef(new Animated.Value(0)).current;

    // Auto-speak on mood change
    useEffect(() => {
        if (mood === 'excited' || mood === 'happy') {
            // Slight delay to not overwhelm
            const timer = setTimeout(() => {
                handlePress();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [mood]);

    // Breathe & Float Animation
    useEffect(() => {
        const breatheAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.05,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        const floatAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(translateYAnim, {
                    toValue: -3,
                    duration: 2000,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(translateYAnim, {
                    toValue: 0,
                    duration: 2500,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );

        breatheAnimation.start();
        floatAnimation.start();

        return () => {
            breatheAnimation.stop();
            floatAnimation.stop();
        };
    }, []);

    // Interactivity
    const [message, setMessage] = React.useState<string | null>(null);

    const showMessage = (text: string) => {
        setMessage(text);
        Animated.sequence([
            Animated.timing(bubbleOpacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.delay(2000),
            Animated.timing(bubbleOpacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePress = async () => {
        // Haptic Feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // "Squish" reaction
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.85,
                duration: 100,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 3,
            }),
        ]).start();

        // ── NEW MESSAGE LOGIC ──────────────────────────────────────────────────
        // 1. Streak Milestone (Top Priority)
        // 2. Memory Message (20% chance if context exists)
        // 3. Time of Day (30% chance)
        // 4. Current Mood (Fallback)

        let selectedMessage = "hey sunshine"; // Default safety
        let messageResolved = false;

        try {
            // 1. Check Streak Milestone
            const streak = await calculateStreak();
            const streakMessages = getStreakMessages(streak);

            if (streakMessages) {
                // Priority 1: Streak Milestone
                selectedMessage = getRandomMessage(streakMessages);
            } else {
                // 2. Memory Message (20% chance)
                let memoryMessage = null;
                if (memoryContext && Math.random() < 0.25) {
                    // Decide which memory type to show
                    const { mood: moodCtx, journal: journalCtx, images: imageCtx } = memoryContext;
                    const possibleTypes: string[] = [];

                    // a. Trend Up
                    if (moodCtx.trend === 'improving') possibleTypes.push('trendUp');
                    // b. Trend Down (gentle support)
                    if (moodCtx.trend === 'declining') possibleTypes.push('trendDown');
                    // c. General Streak (if > 2 and not milestone)
                    if (moodCtx.currentStreak > 2) possibleTypes.push('streak');
                    // d. Journaled recently (last 24h)
                    if (journalCtx.daysSinceLastEntry === 0) possibleTypes.push('journal');
                    // e. Missed (haven't written in 4+ days)
                    if (journalCtx.daysSinceLastEntry > 3) possibleTypes.push('missed');
                    // f. Images (has recent images)
                    if (imageCtx.hasRecentImages) possibleTypes.push('image');

                    if (possibleTypes.length > 0) {
                        const randomType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
                        // @ts-ignore - we added memory to MESSAGES but TS might not know yet continuously
                        const memoryCategory = (MESSAGES as any).memory[randomType];
                        if (memoryCategory) {
                            memoryMessage = getRandomMessage(memoryCategory);
                        }
                    }
                }

                if (memoryMessage && memoryContext) {
                    selectedMessage = resolveMessage(memoryMessage, memoryContext);
                    messageResolved = true;
                } else {
                    // 3. Check Time of Day (30% chance)
                    // Only if NOT anxious/sad/tired - let those moods override time greetings for empathy
                    const isLowMood = mood === 'sad' || mood === 'anxious' || mood === 'tired';
                    const showTimeMessage = !isLowMood && Math.random() < 0.3;

                    if (showTimeMessage) {
                        const timeMessages = getTimeOfDayMessages();
                        selectedMessage = getRandomMessage(timeMessages);
                    } else {
                        // 4. Current Mood
                        let moodMessages: string[] = MESSAGES.idle; // default

                        if (['idle', 'happy', 'sad', 'excited', 'anxious', 'tired'].includes(mood)) {
                            moodMessages = (MESSAGES as any)[mood];
                        }

                        selectedMessage = getRandomMessage(moodMessages);
                    }
                }
            }
        } catch (e) {
            console.warn("Mascot logic error", e);
            // Fallback to simple mood check
            if (['idle', 'happy', 'sad', 'excited', 'anxious', 'tired'].includes(mood)) {
                const moodMessages = (MESSAGES as any)[mood];
                selectedMessage = getRandomMessage(moodMessages);
            }
        }

        // If generic message selected, we might still want to template inject if we add generic tokens later
        // But for now only memory messages are guaranteed to have tokens.
        // However, we can run resolveMessage safely on everything if we want global tokens like {mascotName}
        if (!messageResolved && memoryContext) {
            selectedMessage = resolveMessage(selectedMessage, memoryContext);
        }

        showMessage(selectedMessage);

        // Refresh state (maybe they just journaled?)
        refreshMascot();
    };

    const bubbleTranslateY = bubbleOpacityAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    return (
        <View style={[style, { elevation: 50, zIndex: 50 }]} pointerEvents={isDrawing ? "none" : "box-none"}>
            {/* Speech Bubble - pointerEvents="none" to prevent blocking drawing */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.bubble,
                    {
                        opacity: bubbleOpacityAnim,
                        transform: [{ translateY: bubbleTranslateY }],
                    },
                ]}
            >
                <Text style={styles.bubbleText}>{message}</Text>
                <View style={styles.bubbleArrow} />
            </Animated.View>

            {/* Mascot Image - Wrapped in View to control hit slop and stop propagation to canvas */}
            <View
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                <TouchableWithoutFeedback onPress={handlePress}>
                    <Animated.Image
                        source={ULBO_IMAGE}
                        style={[
                            styles.mascot,
                            { width: size, height: size },
                            {
                                transform: [
                                    { scale: scaleAnim },
                                    { translateY: translateYAnim },
                                ],
                            },
                        ]}
                        resizeMode="contain"
                        onError={(e) => console.log("Mascot image error:", e.nativeEvent.error)}
                    />
                </TouchableWithoutFeedback>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mascot: {
        // Ensure no background color blocks
        backgroundColor: 'transparent',
    },
    bubble: {
        position: 'absolute',
        bottom: '100%',
        marginBottom: 8,
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignSelf: 'center',
        minWidth: 100,
        alignItems: 'center',
    },
    bubbleText: {
        fontFamily: 'Carlito', // Consistent with app font
        fontSize: 14,
        color: '#5E4B3C',
    },
    bubbleArrow: {
        position: 'absolute',
        bottom: -6,
        alignSelf: 'center',
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'white',
    }
});
