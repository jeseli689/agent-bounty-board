const skill = require('./agent-bounty-board/skill/src/index.js');
const fs = require('fs');
const path = require('path');

// Load env
const keyPath = path.join(process.env.HOME, '.usdc/private.key');
process.env.AGENT_PRIVATE_KEY = fs.readFileSync(keyPath, 'utf8').trim();

async function liveDemo() {
    console.log("🦞 Pi (The Lobster) Live Demo - TESTNET EDITION");
    console.log("=============================================");
    console.log("Target: Base Sepolia");
    console.log("USDC: 0x036...F7e");

    const myTask = "Generate 1x Cyberpunk Lobster Image (16:9)";
    const myBudget = "1.0"; // 1 USDC

    // Step 1: Post
    console.log(`\n[1] Posting Bounty...`);
    const postResult = await skill.bounty_post({ 
        description: myTask, 
        amount: myBudget 
    });
    console.log(`    > ${postResult}`);

    // Wait for indexing
    await new Promise(r => setTimeout(r, 2000));

    // Step 2: List (Find the task ID)
    console.log("\n[2] Checking Board...");
    const tasks = await skill.bounty_list({ limit: 5 });
    console.log("    > Found Tasks:", tasks.length);
    // Find our task (the latest one)
    const task = tasks[tasks.length - 1]; 
    console.log(`    > Target Task ID: ${task.id} (${task.description})`);

    // Step 3: Solve (Self-solving for demo)
    console.log(`\n[3] Submitting Solution...`);
    const solution = "ipfs://QmCyberLobsterImage_HighRes";
    const solveResult = await skill.bounty_solve({ 
        taskId: task.id, 
        solution: solution 
    });
    console.log(`    > ${solveResult}`);

    // Step 4: Release
    console.log(`\n[4] Releasing Payment...`);
    // Note: I am both creator and solver here, so I pay myself. 
    // In real flow, solver would be different.
    const releaseResult = await skill.bounty_release({ 
        taskId: task.id, 
        solver: task.creator // Paying myself back for the demo loop
    });
    console.log(`    > ${releaseResult}`);
    
    console.log("\n✅ Testnet Run Complete.");
}

liveDemo();