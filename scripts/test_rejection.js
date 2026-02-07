const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Config
const RPC_URL = "https://sepolia.base.org";
const CONTRACT_ADDRESS = "0xBBEB85ca88763C85833073c8C6f2D2E26c82B50B";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const BOUNTY_ABI = [
    "function postTask(address _token, uint256 _amount, uint256 _stakeAmount, string calldata _description) external",
    "function submitSolution(uint256 _taskId, string calldata _solutionHash) external",
    "function rejectSolution(uint256 _taskId, address _solver, string calldata _reason) external",
    "function tasks(uint256) view returns (address creator, string description, uint256 amount, uint256 stakeAmount, address token, bool active, uint256 timestamp)",
    "function nextTaskId() view returns (uint256)",
    "function treasury() view returns (address)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

// Helper: wait for N confirmations
async function waitForConfirmation(tx, n = 2) {
    console.log(`   Waiting for ${n} confirmations...`);
    await tx.wait(n);
    console.log(`   ✓ Confirmed`);
}

async function main() {
    console.log("🔴 BountyBoard v4 - Rejection/Slashing Test\n");
    
    const keyPath = path.join(process.env.HOME, '.usdc/private.key');
    const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const bounty = new ethers.Contract(CONTRACT_ADDRESS, BOUNTY_ABI, wallet);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
    
    const decimals = await usdc.decimals();
    const formatUSDC = (val) => ethers.formatUnits(val, decimals);
    const parseUSDC = (val) => ethers.parseUnits(val.toString(), decimals);
    
    const BOUNTY_AMOUNT = parseUSDC("2");
    const STAKE_AMOUNT = parseUSDC("1");
    
    const initialBalance = await usdc.balanceOf(wallet.address);
    console.log(`💵 Initial USDC: ${formatUSDC(initialBalance)}`);
    
    const treasury = await bounty.treasury();
    console.log(`🏦 Treasury: ${treasury === ethers.ZeroAddress ? "(not set - stake locks in contract)" : treasury}`);
    
    // Step 1: Approve ALL upfront (bounty + stake)
    console.log(`\n📝 Step 1: Approving ${formatUSDC(BOUNTY_AMOUNT + STAKE_AMOUNT)} USDC...`);
    let tx = await usdc.approve(CONTRACT_ADDRESS, BOUNTY_AMOUNT + STAKE_AMOUNT);
    await waitForConfirmation(tx, 2);
    
    // Step 2: Post Task
    console.log(`\n📝 Step 2: Posting task (Bounty: ${formatUSDC(BOUNTY_AMOUNT)}, Stake: ${formatUSDC(STAKE_AMOUNT)})...`);
    tx = await bounty.postTask(USDC_ADDRESS, BOUNTY_AMOUNT, STAKE_AMOUNT, "Rejection test " + Date.now());
    await waitForConfirmation(tx, 2);
    const taskId = await bounty.nextTaskId() - 1n;
    console.log(`   Task ID: ${taskId}`);
    
    // Step 3: Approve stake for submission
    console.log(`\n📝 Step 3: Approving stake (${formatUSDC(STAKE_AMOUNT)})...`);
    tx = await usdc.approve(CONTRACT_ADDRESS, STAKE_AMOUNT);
    await waitForConfirmation(tx, 2);
    
    // Step 4: Submit Solution
    console.log(`\n🔧 Step 4: Submitting solution (locking stake)...`);
    tx = await bounty.submitSolution(taskId, "ipfs://BadSolution" + Date.now());
    await waitForConfirmation(tx, 2);
    
    const balanceAfterStake = await usdc.balanceOf(wallet.address);
    console.log(`   💵 Balance after stake: ${formatUSDC(balanceAfterStake)}`);
    
    // Step 5: Reject Solution (SLASHING!)
    console.log(`\n🔴 Step 5: REJECTING solution (slashing stake)...`);
    tx = await bounty.rejectSolution(taskId, wallet.address, "Quality too low");
    await waitForConfirmation(tx, 2);
    console.log(`   TX: ${tx.hash}`);
    
    const balanceAfterReject = await usdc.balanceOf(wallet.address);
    console.log(`   💵 Balance after rejection: ${formatUSDC(balanceAfterReject)}`);
    
    // Analysis
    const stakeChange = balanceAfterReject - balanceAfterStake;
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📊 SLASHING ANALYSIS:`);
    console.log(`${"=".repeat(50)}`);
    console.log(`   Stake amount: ${formatUSDC(STAKE_AMOUNT)} USDC`);
    console.log(`   Balance change after reject: ${formatUSDC(stakeChange)} USDC`);
    
    if (stakeChange === 0n) {
        console.log(`\n🦞 ✅ v4 WORKING CORRECTLY!`);
        console.log(`   ✓ Stake was NOT refunded to solver.`);
        console.log(`   ✓ Stake was NOT sent to creator (prevents Honey Pot).`);
        console.log(`   ✓ Stake is locked in contract as penalty.`);
        console.log(`\n   HONEY POT ATTACK: PREVENTED! 🛡️`);
    } else if (stakeChange > 0n) {
        console.log(`\n⚠️ Stake was returned - check logic!`);
    } else {
        console.log(`\n⚠️ Unexpected balance decrease.`);
    }
    
    const finalBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n💵 Final USDC Balance: ${formatUSDC(finalBalance)}`);
    console.log(`📉 Total cost: ${formatUSDC(initialBalance - finalBalance)} USDC`);
    console.log(`   (${formatUSDC(BOUNTY_AMOUNT)} bounty still locked + ${formatUSDC(STAKE_AMOUNT)} slashed)`);
}

main().catch(err => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
});
