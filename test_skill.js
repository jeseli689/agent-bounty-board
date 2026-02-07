const skill = require('./agent-bounty-board/skill/src/index.js');

async function test() {
    console.log("🧪 Testing Agent Bounty Board Skill (Simulation Mode)...\n");

    // 1. Test bounty_post
    console.log("--- 1. Testing bounty_post ---");
    const postResult = await skill.bounty_post({ 
        description: "Test Task via Skill", 
        amount: "1.0" 
    });
    console.log("Result:", postResult);

    // 2. Test bounty_list
    console.log("\n--- 2. Testing bounty_list ---");
    const listResult = await skill.bounty_list({ limit: 5 });
    console.log("Result:", listResult);

    // 3. Test bounty_solve
    console.log("\n--- 3. Testing bounty_solve ---");
    const solveResult = await skill.bounty_solve({ 
        taskId: 42, 
        solution: "ipfs://test" 
    });
    console.log("Result:", solveResult);

    // 4. Test bounty_release
    console.log("\n--- 4. Testing bounty_release ---");
    const releaseResult = await skill.bounty_release({ taskId: 42 });
    console.log("Result:", releaseResult);
}

test();