const skill = require('../skill/index.js');

async function main() {
    try {
        const taskId = 0; // The Hello World task
        const solutionText = "This is the solution: 42";
        
        console.log(`Submitting solution for Task ${taskId}...`);
        const result = await skill.bounty_solve({
            taskId,
            solution: solutionText
        });
        console.log("Solution Submitted:", result);
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
