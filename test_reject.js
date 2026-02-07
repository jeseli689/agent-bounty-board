const skill = require('./skill/src/index.js');

async function testReject() {
    console.log("🧪 Testing Rejection Logic (Mock)...\n");

    const result = await skill.bounty_reject({ 
        taskId: 101, 
        solver: "0xMockSolverAddress", 
        reason: "Image resolution too low" 
    });
    
    console.log(result);
}

testReject();