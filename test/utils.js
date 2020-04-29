const Web3 = require('web3');
const JacksPotDelegate = artifacts.require('./JacksPotDelegate.sol');
const JacksPotProxy = artifacts.require('./JacksPotProxy.sol');

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

const getContractAt = (contract, address) => {
    const w = getWeb3();
    const instance = new w.eth.Contract(contract.abi, address);
    return instance;
};

const getContracts = async (accounts) => {
    const jackpotDelegate = await newContract(JacksPotDelegate);
    
    const jackpotProxy = await newContract(JacksPotProxy);

    await jackpotProxy.methods.upgradeTo(jackpotDelegate._address).send({ from: accounts[0], gas: 10000000 });

    const jackpot = await getContractAt(JacksPotDelegate, jackpotProxy._address);

    await jackpot.methods.init().send({ from: accounts[0], gas: 10000000 });

    return {
        jackpot
    };
};

const clone = x => JSON.parse(JSON.stringify(x));

module.exports = {
    getWeb3,
    newContract,
    getContracts,
    clone,
};
