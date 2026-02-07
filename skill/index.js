const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Configuration
const KEY_PATH = path.join(process.env.HOME, '.usdc/private.key');
const RPC_URL = 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; 
const DEPLOYED_ADDRESS_PATH = path.resolve(__dirname, '../deployed_address.txt');

// Load Artifacts
const ARTIFACT = require('../BountyBoard.json');
const USDC_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
];

async function getWallet() {
    if (!fs.existsSync(KEY_PATH)) throw new Error("Private key not found");
    const key = fs.readFileSync(KEY_PATH, 'utf8').trim();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Wallet(key, provider);
}

async function getContract(wallet) {
    if (!fs.existsSync(DEPLOYED_ADDRESS_PATH)) throw new Error("Contract not deployed");
    const address = fs.readFileSync(DEPLOYED_ADDRESS_PATH, 'utf8').trim();
    return new ethers.Contract(address, ARTIFACT.abi, wallet);
}

module.exports = {
    check_balance: async () => {
        const wallet = await getWallet();
        const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
        
        const ethBalance = await wallet.provider.getBalance(wallet.address);
        const usdcBalance = await usdc.balanceOf(wallet.address);
        
        return {
            address: wallet.address,
            eth: ethers.formatEther(ethBalance),
            usdc: ethers.formatUnits(usdcBalance, 6)
        };
    },

    bounty_stats: async () => {
        const wallet = await getWallet();
        const contract = await getContract(wallet);
        const count = await contract.nextTaskId();
        return { 
            totalTasks: Number(count),
            contractAddress: await contract.getAddress(),
            deployer: wallet.address
        };
    },

    bounty_post: async ({ description, amount }) => {
        const wallet = await getWallet();
        const contract = await getContract(wallet);
        const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

        const amountUnits = ethers.parseUnits(amount.toString(), 6); // USDC = 6 decimals

        // Check Balance
        const balance = await usdc.balanceOf(wallet.address);
        if (balance < amountUnits) {
            throw new Error(`Insufficient USDC. Have: ${ethers.formatUnits(balance, 6)}, Need: ${amount}`);
        }

        // Approve
        console.log("Approving USDC...");
        const txApprove = await usdc.approve(await contract.getAddress(), amountUnits);
        await txApprove.wait();

        // Post
        console.log("Posting Task...");
        const tx = await contract.postTask(USDC_ADDRESS, amountUnits, description);
        const receipt = await tx.wait();
        
        return { status: "success", txHash: receipt.hash, description, amount };
    },

    bounty_list: async ({ limit = 10 }) => {
        const wallet = await getWallet();
        const contract = await getContract(wallet);
        
        const count = await contract.nextTaskId();
        const tasks = [];
        
        for (let i = Math.max(0, Number(count) - limit); i < Number(count); i++) {
            const t = await contract.tasks(i);
            if (t.active) {
                tasks.push({
                    id: i,
                    description: t.description,
                    amount: ethers.formatUnits(t.amount, 6) + " USDC",
                    creator: t.creator
                });
            }
        }
        return tasks;
    },

    bounty_solve: async ({ taskId, solution }) => {
        const wallet = await getWallet();
        const contract = await getContract(wallet);
        const hash = ethers.keccak256(ethers.toUtf8Bytes(solution));
        
        const tx = await contract.submitSolution(taskId, hash);
        await tx.wait();
        
        return { status: "submitted", taskId, hash };
    },

    bounty_release: async ({ taskId, solver }) => {
        const wallet = await getWallet();
        const contract = await getContract(wallet);
        
        const tx = await contract.releaseBounty(taskId, solver);
        await tx.wait();
        
        return { status: "released", taskId, solver };
    }
};
