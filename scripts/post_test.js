const skill = require('../skill/index.js');

async function main() {
    try {
        console.log("Posting Hello World Bounty...");
        const result = await skill.bounty_post({
            description: "Hello World: Verify Bounty Board v1",
            amount: 0.1
        });
        console.log("Success! Result:", result);
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
