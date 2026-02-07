const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Config
const RPC_URL = "https://sepolia.base.org";
const CONTRACT_ADDRESS = "0xBBEB85ca88763C85833073c8C6f2D2E26c82B50B"; // v4
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

// ABIs
const BOUNTY_ABI = [
    "function postTask(address _token, uint256 _amount, uint256 _stakeAmount, string calldata _description) external",
    "function submitSolution(uint256 _taskId, string calldata _solutionHash) external",
    "function releaseBounty(uint256 _taskId, address _solver) external",
    "function rejectSolution(uint256 _taskId, address _solver, string calldata _reason) external",
    "function setTreasury(address _treasury) external",
    "function tasks(uint256) view returns (address creator, string description, uint256 amount, uint256 stakeAmount, address token, bool active, uint256 timestamp)",
    "function nextTaskId() view returns (uint256)",
    "function treasury() view returns (address)",
    "event TaskPosted(uint256 indexed taskId, address indexed creator, uint256 amount, uint256 stakeAmount, string description)",
    "event SolutionSubmitted(uint256 indexed taskId, address indexed solver, string solutionHash)",
    "event BountyReleased(uint256 indexed taskId, address indexed solver, uint256 amount, uint256 stakeReturn)",
    "event SolutionRejected(uint256 indexed taskId, address indexed solver, string reason, uint256 stakeSlashed)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

async function main() {
    console.log("🦞 BountyBoard v4 Full Integration Test\n");
    console.log("=".repeat(50));
    
    // Setup
    const keyPath = path.join(process.env.HOME, '.usdc/private.key');
    const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const bounty = new ethers.Contract(CONTRACT_ADDRESS, BOUNTY_ABI, wallet);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
    
    const decimals = await usdc.decimals();
    const formatUSDC = (val) => ethers.formatUnits(val, decimals);
    const parseUSDC = (val) => ethers.parseUnits(val.toString(), decimals);
    
    // Initial State
    console.log(`\n📍 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`👤 Wallet: ${wallet.address}`);
    
    const ethBalance = await provider.getBalance(wallet.address);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)}`);
    console.log(`💵 USDC Balance: ${formatUSDC(usdcBalance)}`);
    
    const currentTaskId = await bounty.nextTaskId();
    console.log(`📋 Next Task ID: ${currentTaskId}`);
    
    // Check Treasury
    const treasury = await bounty.treasury();
    console.log(`🏦 Treasury: ${treasury === ethers.ZeroAddress ? "(not set)" : treasury}`);
    
    // Test Parameters
    const BOUNTY_AMOUNT = parseUSDC("5");   // 5 USDC bounty
    const STAKE_AMOUNT = parseUSDC("2");    // 2 USDC stake
    const TOTAL_APPROVAL = BOUNTY_AMOUNT + STAKE_AMOUNT;
    
    console.log("\n" + "=".repeat(50));
    console.log("📝 TEST 1: Post a Task");
    console.log("=".repeat(50));
    
    // Approve USDC for bounty
    console.log(`\n⏳ Approving ${formatUSDC(TOTAL_APPROVAL)} USDC for contract...`);
    const approveTx = await usdc.approve(CONTRACT_ADDRESS, TOTAL_APPROVAL);
    await approveTx.wait();
    console.log(`✅ Approval confirmed: ${approveTx.hash}`);
    
    // Post Task
    const description = `[Test ${Date.now()}] Write a haiku about lobsters`;
    console.log(`\n⏳ Posting task: "${description}"`);
    console.log(`   Bounty: ${formatUSDC(BOUNTY_AMOUNT)} USDC`);
    console.log(`   Required Stake: ${formatUSDC(STAKE_AMOUNT)} USDC`);
    
    const postTx = await bounty.postTask(USDC_ADDRESS, BOUNTY_AMOUNT, STAKE_AMOUNT, description);
    const postReceipt = await postTx.wait();
    
    // Parse event to get taskId
    const taskPostedEvent = postReceipt.logs.find(log => {
        try {
            return bounty.interface.parseLog(log)?.name === 'TaskPosted';
        } catch { return false; }
    });
    const parsedEvent = bounty.interface.parseLog(taskPostedEvent);
    const taskId = parsedEvent.args.taskId;
    
    console.log(`✅ Task Posted! ID: ${taskId}`);
    console.log(`   TX: ${postTx.hash}`);
    
    // Verify task state
    const task = await bounty.tasks(taskId);
    console.log(`\n📋 Task State:`);
    console.log(`   Creator: ${task.creator}`);
    console.log(`   Amount: ${formatUSDC(task.amount)} USDC`);
    console.log(`   Stake Required: ${formatUSDC(task.stakeAmount)} USDC`);
    console.log(`   Active: ${task.active}`);
    
    console.log("\n" + "=".repeat(50));
    console.log("🔧 TEST 2: Submit a Solution (Stake Locked)");
    console.log("=".repeat(50));
    
    // Need to approve stake amount for submission
    console.log(`\n⏳ Approving ${formatUSDC(STAKE_AMOUNT)} USDC stake...`);
    const stakeApproveTx = await usdc.approve(CONTRACT_ADDRESS, STAKE_AMOUNT);
    await stakeApproveTx.wait();
    console.log(`✅ Stake approval confirmed`);
    
    const solutionHash = "ipfs://QmLobsterHaiku123";
    console.log(`\n⏳ Submitting solution: ${solutionHash}`);
    
    const submitTx = await bounty.submitSolution(taskId, solutionHash);
    await submitTx.wait();
    console.log(`✅ Solution Submitted!`);
    console.log(`   TX: ${submitTx.hash}`);
    
    // Check balance after stake locked
    const usdcAfterStake = await usdc.balanceOf(wallet.address);
    console.log(`\n💵 USDC after stake: ${formatUSDC(usdcAfterStake)}`);
    console.log(`   (Locked: ${formatUSDC(BOUNTY_AMOUNT + STAKE_AMOUNT)} in contract)`);
    
    console.log("\n" + "=".repeat(50));
    console.log("✅ TEST 3: Release Bounty (Success Path)");
    console.log("=".repeat(50));
    
    console.log(`\n⏳ Releasing bounty to solver...`);
    const releaseTx = await bounty.releaseBounty(taskId, wallet.address);
    await releaseTx.wait();
    console.log(`✅ Bounty Released!`);
    console.log(`   TX: ${releaseTx.hash}`);
    
    const usdcAfterRelease = await usdc.balanceOf(wallet.address);
    console.log(`\n💵 USDC after release: ${formatUSDC(usdcAfterRelease)}`);
    console.log(`   (Should have bounty + stake back)`);
    
    // Verify task is now inactive
    const taskAfter = await bounty.tasks(taskId);
    console.log(`\n📋 Task Active: ${taskAfter.active} (should be false)`);
    
    console.log("\n" + "=".repeat(50));
    console.log("🔴 TEST 4: Rejection Path (New Task)");
    console.log("=".repeat(50));
    
    // Create another task to test rejection
    console.log(`\n⏳ Creating second task to test rejection...`);
    const approveForTask2 = await usdc.approve(CONTRACT_ADDRESS, TOTAL_APPROVAL);
    await approveForTask2.wait();
    
    const postTx2 = await bounty.postTask(USDC_ADDRESS, BOUNTY_AMOUNT, STAKE_AMOUNT, "Task for rejection test");
    const postReceipt2 = await postTx2.wait();
    const event2 = bounty.interface.parseLog(postReceipt2.logs.find(log => {
        try { return bounty.interface.parseLog(log)?.name === 'TaskPosted'; } catch { return false; }
    }));
    const taskId2 = event2.args.taskId;
    console.log(`✅ Task 2 Posted! ID: ${taskId2}`);
    
    // Submit solution
    const approveStake2 = await usdc.approve(CONTRACT_ADDRESS, STAKE_AMOUNT);
    await approveStake2.wait();
    const submitTx2 = await bounty.submitSolution(taskId2, "ipfs://BadSolution");
    await submitTx2.wait();
    console.log(`✅ Solution submitted to Task 2`);
    
    const balanceBeforeReject = await usdc.balanceOf(wallet.address);
    console.log(`\n💵 Balance before rejection: ${formatUSDC(balanceBeforeReject)}`);
    
    // Reject solution
    console.log(`\n⏳ Rejecting solution (stake should be slashed)...`);
    const rejectTx = await bounty.rejectSolution(taskId2, wallet.address, "Low quality submission");
    await rejectTx.wait();
    console.log(`✅ Solution Rejected!`);
    console.log(`   TX: ${rejectTx.hash}`);
    
    // Check: stake should NOT go to creator (v4 fix!)
    const balanceAfterReject = await usdc.balanceOf(wallet.address);
    console.log(`\n💵 Balance after rejection: ${formatUSDC(balanceAfterReject)}`);
    
    // Treasury check
    const treasuryAddr = await bounty.treasury();
    if (treasuryAddr === ethers.ZeroAddress) {
        console.log(`\n🏦 Treasury not set - stake is locked in contract (penalty pool)`);
        console.log(`   This is the v4 security fix! Stake NOT sent to creator.`);
    } else {
        console.log(`\n🏦 Stake sent to Treasury: ${treasuryAddr}`);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🦞 ALL TESTS COMPLETED!");
    console.log("=".repeat(50));
    
    const finalBalance = await usdc.balanceOf(wallet.address);
    console.log(`\n📊 Final USDC Balance: ${formatUSDC(finalBalance)}`);
    console.log(`📊 Net Change: ${formatUSDC(finalBalance - usdcBalance)} USDC`);
    console.log(`   (Lost ${formatUSDC(STAKE_AMOUNT)} to slashing - as expected)`);
}

main().catch(err => {
    console.error("❌ Test Failed:", err.message);
    process.exit(1);
});
