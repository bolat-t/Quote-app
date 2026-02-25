
// src/memory/testMemory.ts
import { buildMemoryContext, resolveMessage } from './MemorySystem';

const runTest = async () => {
    console.log("Starting Memory System Test...");

    try {
        const context = await buildMemoryContext();
        console.log("Memory Context Built Successfully:");
        console.log(JSON.stringify(context, null, 2));

        // Test Templates
        const templates = [
            "Streak: {streak}",
            "Trend: {trend}",
            "Mascot: {mascotName}",
            "Last Entry: {daysSinceLastEntry} days ago"
        ];

        console.log("\nTesting Template Resolution:");
        templates.forEach(t => {
            console.log(`"${t}" -> "${resolveMessage(t, context)}"`);
        });

    } catch (e) {
        console.error("Test Failed:", e);
    }
};

// runTest(); // Uncomment to run if called directly, or import
export default runTest;
