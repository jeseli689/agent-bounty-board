const skill = require('../skill/index.js');

async function main() {
    try {
        console.log("Fetching active bounties...");
        const tasks = await skill.bounty_list({ limit: 5 });
        console.log("Active Tasks:");
        console.log(JSON.stringify(tasks, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
