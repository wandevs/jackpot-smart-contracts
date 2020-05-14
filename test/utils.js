const Web3 = require('web3');
const assert = require('assert');
const JacksPotDelegate = artifacts.require('./JacksPotDelegate.sol');
const JacksPotProxy = artifacts.require('./JacksPotProxy.sol');
const TestHelper = artifacts.require('./test/TestHelper.sol');
const TestBasicStorage = artifacts.require('./test/TestBasicStorage.sol');

const BigNumber = require('bignumber.js');

const fullTest = false;

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
        jackpot,
        jackpotDelegate,
        jackpotProxy
    };
};


const getContractsWithoutDelegate = async (accounts) => {
    const jackpotDelegate = await newContract(JacksPotDelegate);
    
    const jackpotProxy = await newContract(JacksPotProxy);

    const jackpot = await getContractAt(JacksPotDelegate, jackpotProxy._address);

    await jackpot.methods.init().send({ from: accounts[0], gas: 10000000 });

    return {
        jackpot,
        jackpotDelegate,
        jackpotProxy
    };
};

const clone = x => JSON.parse(JSON.stringify(x));

const getTestHelper = async () => {
    const testHelper = await newContract(TestHelper);
    return testHelper;
}

const getTestBasicStorage = async () => {
    const testBasicStorage = await newContract(TestBasicStorage);
    return testBasicStorage;
}

const resAssert = (res, gasUsed, eventName, item, value) => {
    assert.equal(Math.abs(Number(res.gasUsed) - Number(gasUsed)) < 10000, true, "Gas used not match:" + res.gasUsed.toString() + ":" + gasUsed.toString());
    if (eventName) {
        assert.equal(res.events[eventName] != undefined, true, "Event name not found");
    }

    if (item) {
        assert.equal(res.events[eventName].returnValues[item], value, "Event value incorrect");
    }
}

module.exports = {
    getWeb3,
    newContract,
    getContracts,
    clone,
    getContractsWithoutDelegate,
    fullTest,
    getTestHelper,
    getTestBasicStorage,
    resAssert,
};
