const skill = require('../skill/index.js');

async function main() {
    try {
        console.log("Checking balances...");
        const balance = await skill.check_balance();
        console.log("Balance:", balance);
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
