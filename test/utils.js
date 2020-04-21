const Web3 = require('web3');
const JacksPot = artifacts.require('./JacksPot.sol');
const BigNumber = require('bignumber.js');

BigNumber.config({ EXPONENTIAL_AT: 1000 });

const getWeb3 = () => {
    const myWeb3 = new Web3(web3.currentProvider);
    return myWeb3;
};

const newContract = async (contract, ...args) => {
    const c = await contract.new(...args);
    const w = getWeb3();
    const instance = new w.eth.Contract(contract.abi, c.address);
    return instance;
};

const newContractAt = (contract, address) => {
    const w = getWeb3();
    const instance = new w.eth.Contract(contract.abi, address);
    return instance;
};

const getJackPotAt = (address) => {
    const jackpot = newContractAt(JacksPot, address);
    return jackpot;
}

const getContracts = async () => {
    const jackpot = await newContract(JacksPot);
    return {
        jackpot
    };
};

const clone = x => JSON.parse(JSON.stringify(x));

module.exports = {
    getWeb3,
    newContract,
    newContractAt,
    getContracts,
    getJackPotAt,
    clone,
};
