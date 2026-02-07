const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.resolve(__dirname, '../contracts/BountyBoard.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'BountyBoard.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

console.log('Compiling...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    output.errors.forEach((err) => {
        console.error(err.formattedMessage);
    });
}

const contract = output.contracts['BountyBoard.sol']['BountyBoard'];
fs.writeFileSync(
    path.resolve(__dirname, '../BountyBoard.json'),
    JSON.stringify(contract, null, 2)
);
console.log('Compilation successful! Wrote BountyBoard.json');
