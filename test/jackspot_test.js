const assert = require('assert');
const { getContracts, getWeb3, getJackPotAt } = require('./utils');

const stake = web3.toWei(10);

contract('JacksPot', accounts => {
  before(async () => {
    let length = accounts.length < 20 ? accounts.length : 20;
    for (let i = 1; i < length; i++) {
      await getWeb3().eth.sendTransaction({ from: accounts[i], to: accounts[0], value: web3.toWei(50) });
    }
  });

  it('should success when codes and amounts are correct', async () => {
    let jackpot = (await getContracts()).jackpot;

    let res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    assert.equal(res.status, true);

    let balance = await getWeb3().eth.getBalance(jackpot._address);
    assert.equal(balance, stake * 2);

    res = await jackpot.methods.stakeIn([3333, 1234, 0], [stake, stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
    assert.equal(res.status, true);

    balance = await getWeb3().eth.getBalance(jackpot._address);
    assert.equal(balance, stake * 5);

    assert.equal(res.events.StakeIn.returnValues.codes.toString(), [3333, 1234, 0].toString());

    res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    assert.equal(res.status, true);

    res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[accounts.length - 1], value: stake * 2, gas: 10000000 });
    assert.equal(res.status, true);

    assert.equal(res.events.PoolUpdate.returnValues.demandDepositPool, web3.toWei(90).toString());
    assert.equal(res.events.PoolUpdate.returnValues.baseDemandPool, web3.toWei(90).toString());
  });

  it('should failed when codes and amounts are invalid', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeIn([1111, 2222], []).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeIn([0, 0], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeIn([1111, 2222], [web3.toWei(5), stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeIn([1111, 2222], [web3.toWei(25), stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake, stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeIn([], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      let codes = [1];
      let amounts = [web3.toWei(1)];
      for (let i = 0; i < 51; i++) {
        amounts.push(stake);
      }
      await jackpot.methods.stakeIn(codes, amounts).send({ from: accounts[0], value: stake * 51, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      let codes = [1];
      let amounts = [web3.toWei(1)];
      for (let i = 0; i < 51; i++) {
        codes.push(i);
      }
      await jackpot.methods.stakeIn(codes, amounts).send({ from: accounts[0], value: stake * 51, gas: 10000000 });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed when closed', async () => {

  });

});
