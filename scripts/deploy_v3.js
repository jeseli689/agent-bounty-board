const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Base Sepolia Configuration
const RPC_URL = "https://sepolia.base.org"; 

async function main() {
    console.log("🦞 Deploying BountyBoard v3 (Staking) to Base Sepolia Testnet...");
    
    // 1. Load Identity
    const keyPath = path.join(process.env.HOME, '.usdc/private.key');
    if (!fs.existsSync(keyPath)) {
        console.error(`❌ Error: Private key not found at ${keyPath}`);
        process.exit(1);
    }
    const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const balance = await provider.getBalance(wallet.address);
    console.log(`👤 Deployer: ${wallet.address}`);
    console.log(`💰 Balance:  ${ethers.formatEther(balance)} ETH`);

    // 2. Load v3 Artifacts
    const artifactPath = path.resolve(__dirname, '../BountyBoard_v3.json');
    if (!fs.existsSync(artifactPath)) {
        console.error("❌ Build artifact not found. Please compile first.");
        process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    // 3. Deploy
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    try {
        const contract = await factory.deploy(); 
        console.log("⏳ Waiting for confirmation...");
        await contract.waitForDeployment();
        
        const address = await contract.getAddress();
        console.log(`✅ BountyBoard v3 Deployed: ${address}`);
        console.log(`   Explorer: https://sepolia.basescan.org/address/${address}`);

        // 4. Save Config
        const configPath = path.resolve(__dirname, '../deployed_address_testnet.txt');
        fs.writeFileSync(configPath, address);
        console.log(`💾 Address saved to ${configPath}`);
        
        // Also update README automatically (Self-healing)
        const readmePath = path.resolve(__dirname, '../README.md');
        let readme = fs.readFileSync(readmePath, 'utf8');
        readme = readme.replace(/Contract on Base\*\*: `0x[a-fA-F0-9]+`/, `Contract on Base**: \`${address}\``);
        fs.writeFileSync(readmePath, readme);
        console.log(`📄 README updated with new contract address.`);

    } catch (err) {
        console.error("❌ Deployment Failed:", err.message);
    }
}

main();
