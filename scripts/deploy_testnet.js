const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Base Sepolia Configuration
const RPC_URL = "https://sepolia.base.org"; 
const USDC_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Circle's Official USDC on Base Sepolia

async function main() {
    console.log("🦞 Deploying to Base Sepolia Testnet...");
    
    // 1. Load Identity
    const keyPath = path.join(process.env.HOME, '.usdc/private.key');
    if (!fs.existsSync(keyPath)) {
        console.error(`❌ Error: Private key not found at ${keyPath}`);
        console.error("👉 Please run: echo 'YOUR_PRIVATE_KEY' > ~/.usdc/private.key");
        process.exit(1);
    }
    const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const balance = await provider.getBalance(wallet.address);
    console.log(`👤 Deployer: ${wallet.address}`);
    console.log(`💰 Balance:  ${ethers.formatEther(balance)} ETH`);

    // 2. Load Artifacts
    // Assumption: Compiled JSON exists. If not, we might need to compile on the fly.
    // For MVP, I'll assume standard hardhat output structure or simplistic solc output.
    // Let's try to load the existing JSON.
    const artifactPath = path.resolve(__dirname, '../BountyBoard.json');
    if (!fs.existsSync(artifactPath)) {
        console.error("❌ Build artifact not found. Please compile first.");
        // TODO: Add simple compilation here if needed.
        process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    // Fix: Correct path for bytecode in standard JSON output
    const bytecode = artifact.evm?.bytecode?.object || artifact.bytecode;
    if (!bytecode) {
        throw new Error("Bytecode not found in artifact JSON");
    }

    // 3. Deploy
    const factory = new ethers.ContractFactory(artifact.abi, bytecode, wallet);
    
    // Note: Our BountyBoard might not take constructor args, but if it's "Ownable", it's implicit.
    // Let's check contract source if possible, but standard deploy is usually arg-less for simple boards.
    try {
        const contract = await factory.deploy(); 
        console.log("⏳ Waiting for confirmation...");
        await contract.waitForDeployment();
        
        const address = await contract.getAddress();
        console.log(`✅ BountyBoard Deployed: ${address}`);
        console.log(`   Explorer: https://sepolia.basescan.org/address/${address}`);

        // 4. Save Config for Skill
        const configPath = path.resolve(__dirname, '../deployed_address_testnet.txt');
        fs.writeFileSync(configPath, address);
        console.log(`💾 Address saved to ${configPath}`);

    } catch (err) {
        console.error("❌ Deployment Failed:", err.message);
    }
}

main();
