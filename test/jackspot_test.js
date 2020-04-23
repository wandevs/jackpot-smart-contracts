const assert = require('assert');
const { getContracts, getWeb3, getJackPotAt } = require('./utils');
const BigNumber = require('bignumber.js');

const stake = web3.toWei(10);
const gasPrice = 180e9;


contract('JacksPot', accounts => {
  before(async () => {
    let length = accounts.length < 20 ? accounts.length : 20;
    for (let i = 1; i < length; i++) {
      await getWeb3().eth.sendTransaction({ from: accounts[i], to: accounts[0], value: web3.toWei(50) });
    }
  });

  it('stakeIn success when codes and amounts are correct', async () => {
    let jackpot = (await getContracts()).jackpot;

    let balance0 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
    assert.equal(res.status, true);
    let balance1 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let value = new BigNumber(stake*2);
    let gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    assert.equal(balance0.toString(), (balance1.plus(value).plus(gas)).toString());

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

    let codes = [];
    let amounts = [];
    for (let i = 0; i < 50; i++) {
      amounts.push(stake);
      codes.push(i);
    }
    res = await jackpot.methods.stakeIn(codes, amounts).send({ from: accounts[0], value: stake * 50, gas: 10000000 });
    // console.log(res);
    assert.equal(res.events.PoolUpdate.returnValues.demandDepositPool, web3.toWei(590).toString());

    let ret = await jackpot.methods.stakerInfoMap(accounts[0]).call();
    // console.log(ret);
    assert.equal(ret.codeCount, '54');

    // ret = await jackpot.methods.codesMap(1111).call();
    // assert.equal(ret, '2');

    // res = await jackpot.methods.stakeOut(codes).send({ from: accounts[0], value: 0, gas: 10000000 });
    // // console.log('gasUsed:', res.gasUsed);
    // ret = await jackpot.methods.stakerInfoMap(accounts[0]).call();
    // // console.log(ret);
    // assert.equal(ret.codeCount, '4');
  });

  it('stakeIn failed when codes and amount length not match', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount length == 0', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], []).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount < 10', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [web3.toWei(5), stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount % 10 != 0', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [web3.toWei(25), stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount length > codes length', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake, stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when value not match amount', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when codes larger than maxDigital', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([11111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when codes length == 0', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount length > 50', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      let codes = [1];
      let amounts = [web3.toWei(1)];
      for (let i = 0; i < 51; i++) {
        amounts.push(stake);
      }
      await jackpot.methods.stakeIn(codes, amounts).send({ from: accounts[0], value: stake * 51, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when codes length > 50', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      let codes = [1];
      let amounts = [web3.toWei(1)];
      for (let i = 0; i < 51; i++) {
        codes.push(i);
      }
      await jackpot.methods.stakeIn(codes, amounts).send({ from: accounts[0], value: stake * 51, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeOut success when demandDepositPool is enough', async () => {
    let jackpot = (await getContracts()).jackpot;
    let balance0 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
    assert.equal(res.status, true);
    let balance1 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let value = new BigNumber(stake*2);
    let gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    assert.equal(balance0.toString(), (balance1.plus(value).plus(gas)).toString());

    res = await jackpot.methods.stakeOut([1111, 2222]).send({ from: accounts[0], value: 0, gas: 10000000, gasPrice });
    assert.equal(res.status, true);
    assert.equal(res.events.StakeOut.returnValues.pending, false);

    gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    let balance2 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    assert.equal(balance1.plus(value).toString(), balance2.plus(gas).toString());
  });

  it('stakeOut failed when codes length > 100', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      let codes = [];
      for (let i = 0; i < 101; i++) {
        codes.push(i);
      }
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut(codes).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeOut failed when value != 0', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut([0]).send({ from: accounts[0], value: 1, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/non-payable/));
    }
  });

  it('stakeOut failed when codes have same number', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut([0, 0]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeOut failed when codes value too large', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut([11110, 0]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeOut failed when codes length == 0', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut([]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed when normal transfer to sc', async () => {
    let jackpot = (await getContracts()).jackpot;
    try {
      await getWeb3().eth.sendTransaction({from:accounts[0], value:1, to: jackpot._address});
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('open and close test', async () => {

  });

});