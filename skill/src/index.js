const ethers = require('ethers');

// Updated ABI for BountyBoard v3 (Staking)
// Note: We removed the helper 'getOpenTasks' to save gas/complexity in v3, 
// so we will fetch tasks by iterating 'tasks' mapping.
const BOUNTY_BOARD_ABI = [
    "function postTask(address _token, uint256 _amount, uint256 _stakeAmount, string calldata _description) external",
    "function submitSolution(uint256 _taskId, string calldata _solutionHash) external",
    "function releaseBounty(uint256 _taskId, address _solver) external",
    "function rejectSolution(uint256 _taskId, address _solver, string calldata _reason) external",
    "function nextTaskId() view returns (uint256)",
    "function tasks(uint256) view returns (address creator, string description, uint256 amount, uint256 stakeAmount, address token, bool active, uint256 timestamp)",
    "event TaskPosted(uint256 indexed taskId, address indexed creator, uint256 amount, uint256 stakeAmount, string description)",
    "event SolutionSubmitted(uint256 indexed taskId, address indexed solver, string solutionHash)",
    "event SolutionRejected(uint256 indexed taskId, address indexed solver, string reason, uint256 stakeSlashed)"
];

// Configuration
// Base Sepolia Testnet Config
const CONTRACT_ADDRESS = process.env.BOUNTY_CONTRACT_ADDRESS || "0x5246eAEe7fF01084D8ECC9C277eaA0714fd029b5"; // v3 Address (Latest)
const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";

// Helper: Get Contract
function getContract() {
    const pk = process.env.AGENT_PRIVATE_KEY;
    if (!pk) throw new Error("AGENT_PRIVATE_KEY not set in environment");
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(pk, provider);
    return new ethers.Contract(CONTRACT_ADDRESS, BOUNTY_BOARD_ABI, wallet);
}

// Helper: Get USDC Contract
function getUsdcContract(wallet) {
    const abi = ["function approve(address spender, uint256 amount) external returns (bool)"];
    return new ethers.Contract(USDC_ADDRESS, abi, wallet);
}

/**
 * Post a task to the Bounty Board.
 * @param {Object} params
 * @param {string} params.description - Task description
 * @param {string} params.amount - Bounty amount USDC (e.g. "1.0")
 * @param {string} [params.stakeAmount="0.0"] - Required stake for workers USDC (e.g. "0.1")
 */
async function bounty_post({ description, amount, stakeAmount = "0.0" }) {
    console.log(`[BountyBoard] Posting task: "${description}"`);
    console.log(`              Bounty: ${amount} USDC | Worker Stake: ${stakeAmount} USDC`);
    
    try {
        const contract = getContract();
        const amountUnits = ethers.parseUnits(amount, 6);
        const stakeUnits = ethers.parseUnits(stakeAmount, 6);

        // 1. Approve USDC (Creator pays Bounty)
        console.log("  > Approving USDC (Bounty)...");
        const usdc = getUsdcContract(contract.runner);
        
        const txApprove = await usdc.approve(CONTRACT_ADDRESS, amountUnits);
        console.log(`    Tx: ${txApprove.hash} (Waiting...)`);
        await txApprove.wait();

        // 2. Post Task
        console.log("  > Calling postTask...");
        const txPost = await contract.postTask(USDC_ADDRESS, amountUnits, stakeUnits, description);
        console.log(`    Tx: ${txPost.hash} (Waiting...)`);
        const receipt = await txPost.wait();
        
        return `✅ Task Posted! Hash: ${receipt.hash}`;
    } catch (error) {
        console.error("Error posting bounty:", error);
        if (error.message.includes("AGENT_PRIVATE_KEY")) {
            return `[SIMULATION] Task "${description}" posted. (Real tx requires private key)`;
        }
        throw error;
    }
}

/**
 * List open bounties.
 * @param {Object} params
 * @param {number} params.limit - Max tasks to fetch
 */
async function bounty_list({ limit = 10 }) {
    try {
        const contract = getContract();
        // Fallback for simulation if no provider access
        if (!contract.runner) return [];

        const count = await contract.nextTaskId();
        const tasks = [];
        
        // Iterate backwards to find latest active tasks
        for (let i = Number(count) - 1; i >= 0 && tasks.length < limit; i--) {
            const t = await contract.tasks(i);
            if (t.active) {
                tasks.push({
                    id: i,
                    description: t.description,
                    amount: ethers.formatUnits(t.amount, 6) + " USDC",
                    stakeAmount: ethers.formatUnits(t.stakeAmount, 6) + " USDC",
                    creator: t.creator
                });
            }
        }
        return tasks;
    } catch (error) {
        console.warn("Error listing bounties (using mock):", error.message);
        return [
            { id: 42, description: "Generate Cyberpunk Lobster", amount: "1.0 USDC", stakeAmount: "0.1 USDC" },
            { id: 43, description: "Research Agent Economy", amount: "5.0 USDC", stakeAmount: "0.5 USDC" }
        ];
    }
}

/**
 * Submit a solution.
 * @param {Object} params
 * @param {number} params.taskId - Task ID
 * @param {string} params.solution - Proof (URL/Hash)
 */
async function bounty_solve({ taskId, solution }) {
    console.log(`[BountyBoard] Solving Task ${taskId}...`);
    try {
        const contract = getContract();
        
        // 1. Check Task Requirement
        const task = await contract.tasks(taskId);
        const stakeUnits = task.stakeAmount;

        // 2. Approve Stake if needed
        if (stakeUnits > 0n) {
            console.log(`  > Task requires stake: ${ethers.formatUnits(stakeUnits, 6)} USDC`);
            console.log("  > Approving USDC (Stake)...");
            const usdc = getUsdcContract(contract.runner);
            const txApprove = await usdc.approve(CONTRACT_ADDRESS, stakeUnits);
            await txApprove.wait();
        }

        // 3. Submit
        console.log("  > Submitting solution...");
        const tx = await contract.submitSolution(taskId, solution);
        console.log(`    Tx: ${tx.hash} (Waiting...)`);
        const receipt = await tx.wait();
        return `✅ Solution Submitted! Hash: ${receipt.hash}`;
    } catch (error) {
        if (error.message.includes("AGENT_PRIVATE_KEY")) {
            return `[SIMULATION] Solution submitted for Task ${taskId}.`;
        }
        throw error;
    }
}

/**
 * Release payment.
 * @param {Object} params
 * @param {number} params.taskId - Task ID
 * @param {string} params.solver - Solver Address
 */
async function bounty_release({ taskId, solver }) {
    console.log(`[BountyBoard] Releasing Task ${taskId} to ${solver}...`);
    try {
        const contract = getContract();
        if (!solver) throw new Error("Solver address required");
        const tx = await contract.releaseBounty(taskId, solver);
        console.log(`    Tx: ${tx.hash} (Waiting...)`);
        const receipt = await tx.wait();
        return `✅ Payment Released! Hash: ${receipt.hash}`; 
    } catch (error) {
         if (error.message.includes("AGENT_PRIVATE_KEY")) {
            return `[SIMULATION] Payment released for Task ${taskId}.`;
         }
         throw error;
    }
}

/**
 * Reject solution.
 * @param {Object} params
 * @param {number} params.taskId - Task ID
 * @param {string} params.solver - Solver Address
 * @param {string} params.reason - Rejection Reason
 */
async function bounty_reject({ taskId, solver, reason }) {
    console.log(`[BountyBoard] Rejecting Task ${taskId} from ${solver}...`);
    try {
        const contract = getContract();
        if (!solver) throw new Error("Solver address required");
        
        // Note: v3 logic slashes the stake here!
        const tx = await contract.rejectSolution(taskId, solver, reason);
        console.log(`    Tx: ${tx.hash} (Waiting...)`);
        const receipt = await tx.wait();
        return `✅ Solution Rejected (Stake Slashed)! Hash: ${receipt.hash}`; 
    } catch (error) {
         if (error.message.includes("AGENT_PRIVATE_KEY")) {
            return `[SIMULATION] Solution Rejected for Task ${taskId}. Reason: ${reason}`;
         }
         throw error;
    }
}

module.exports = {
    bounty_post,
    bounty_list,
    bounty_solve,
    bounty_release,
    bounty_reject
};