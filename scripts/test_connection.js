const skill = require('../skill/index.js');

async function test() {
    try {
        console.log("Checking stats...");
        const stats = await skill.bounty_stats();
        console.log("Stats:", stats);
        console.log("Self-test PASSED ✅");
    } catch (e) {
        console.error("Self-test FAILED ❌", e);
    }
}

test();
