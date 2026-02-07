const ethers = require('ethers');
// Assumes ABI is available. In a real npm package, this would be bundled.
const BOUNTY_BOARD_ABI = [
    "function postTask(address _token, uint256 _amount, string calldata _description) external",
    "function submitSolution(uint256 _taskId, string calldata _solutionHash) external",
    "function releaseBounty(uint256 _taskId, address _solver) external",
    "function rejectSolution(uint256 _taskId, address _solver, string calldata _reason) external",
    "function getOpenTasks(uint256 limit) view returns (tuple(uint256 id, address creator, string description, uint256 amount, bool active)[])",
    "event TaskPosted(uint256 indexed taskId, address indexed creator, uint256 amount, string description)",
    "event SolutionSubmitted(uint256 indexed taskId, address indexed solver, string solutionHash)"
];

// Configuration
// In production, these should be environment variables
// Base Sepolia Testnet Config
const CONTRACT_ADDRESS = process.env.BOUNTY_CONTRACT_ADDRESS || "0xEB6700E3382a120DC38394837A78Dcd86e7EF01b";
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
 * @param {string} params.amount - USDC amount (e.g. "1.0")
 */
async function bounty_post({ description, amount }) {
    console.log(`[BountyBoard] Posting task: "${description}" for ${amount} USDC`);
    
    try {
        const contract = getContract();
        const amountUnits = ethers.parseUnits(amount, 6); // USDC has 6 decimals

        // 1. Approve USDC
        console.log("  > Approving USDC...");
        const usdc = getUsdcContract(contract.runner);
        
        // Check allowance? No, just approve for MVP.
        const txApprove = await usdc.approve(CONTRACT_ADDRESS, amountUnits);
        console.log(`    Tx: ${txApprove.hash} (Waiting...)`);
        await txApprove.wait();

        // 2. Post Task
        console.log("  > Calling postTask...");
        const txPost = await contract.postTask(USDC_ADDRESS, amountUnits, description);
        console.log(`    Tx: ${txPost.hash} (Waiting...)`);
        const receipt = await txPost.wait();
        
        return `✅ Task Posted! Hash: ${receipt.hash}`;
    } catch (error) {
        console.error("Error posting bounty:", error);
        // Fallback for Demo Video (if no key provided)
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
        const contract = getContract(); // Can use provider-only here if optimized
        const tasks = await contract.getOpenTasks(limit);
        
        return tasks
            .filter(t => t.active)
            .map(t => ({
                id: Number(t.id),
                description: t.description,
                amount: ethers.formatUnits(t.amount, 6) + " USDC",
                creator: t.creator
            }));
    } catch (error) {
        // Mock fallback for demo
        return [
            { id: 42, description: "Generate Cyberpunk Lobster", amount: "1.0 USDC" },
            { id: 43, description: "Research Agent Economy", amount: "5.0 USDC" }
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
        const tx = await contract.rejectSolution(taskId, solver, reason);
        console.log(`    Tx: ${tx.hash} (Waiting...)`);
        const receipt = await tx.wait();
        return `✅ Solution Rejected! Hash: ${receipt.hash}`; 
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