const skill = require('../skill/index.js');

async function main() {
    try {
        const taskId = 0;
        // In a real scenario, we would check the solver address from the event logs.
        // Here we are paying ourselves (the deployer) just to test the flow.
        const solverAddress = "0xC099D13061C63D6B3699BDb286316170a603D789"; 
        
        console.log(`Releasing bounty for Task ${taskId} to ${solverAddress}...`);
        const result = await skill.bounty_release({
            taskId,
            solver: solverAddress
        });
        console.log("Bounty Released:", result);
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
