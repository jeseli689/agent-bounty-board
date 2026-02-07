const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    const keyPath = path.join(process.env.HOME, '.usdc/private.key');
    if (!fs.existsSync(keyPath)) {
        console.error(`Error: Private key not found at ${keyPath}`);
        process.exit(1);
    }

    const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
    // Base Mainnet RPC
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Deploying from: ${wallet.address}`);
    
    const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../BountyBoard.json'), 'utf8'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.evm.bytecode.object, wallet);

    try {
        const contract = await factory.deploy();
        await contract.waitForDeployment();
        console.log(`BountyBoard deployed to: ${await contract.getAddress()}`);
        
        // Save address
        fs.writeFileSync(
            path.resolve(__dirname, '../deployed_address.txt'),
            await contract.getAddress()
        );
    } catch (error) {
        console.error('Deployment failed:', error);
    }
}

main();
