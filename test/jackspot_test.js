const assert = require('assert');
const { getContracts, getWeb3, getJackPotAt } = require('./utils');
const BigNumber = require('bignumber.js');

const stake = web3.utils.toWei('10');
const stake2 = web3.utils.toWei('20');
const stake3 = web3.utils.toWei('30');
const stake4 = web3.utils.toWei('40');

const gasPrice = 180e9;


contract('JacksPot', accounts => {
  before(async () => {
  });

  it('stakeIn success when codes and amounts are correct', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    // console.log(web3.utils.fromWei(await getWeb3().eth.getBalance(accounts[0])));

    let balance0 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
    console.log('gasUsed:', res.gasUsed);
    console.log(res.events.StakeIn.returnValues, await jackpot.methods.stakerInfoMap(accounts[0]).call());
    assert.equal(res.status, true);
    let balance1 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let value = new BigNumber(stake * 2);
    let gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    assert.equal(balance0.toString(), (balance1.plus(value).plus(gas)).toString());

    let balance = await getWeb3().eth.getBalance(jackpot._address);
    assert.equal(balance, stake * 2);

    res = await jackpot.methods.stakeIn([3333, 1234, 0], [stake, stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
    console.log('events:', res.events);
    console.log('gasUsed:', res.gasUsed);
    assert.equal(res.status, true);

    balance = await getWeb3().eth.getBalance(jackpot._address);
    assert.equal(balance, stake * 5);

    // assert.equal(res.events.StakeIn.returnValues.codes.toString(), [3333, 1234, 0].toString());

    res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    console.log('events:', res.events);

    console.log('gasUsed:', res.gasUsed);
    assert.equal(res.status, true);

    res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[accounts.length - 1], value: stake * 2, gas: 10000000 });
    console.log('events:', res.events);

    console.log('gasUsed:', res.gasUsed);
    assert.equal(res.status, true);

    let codes = [];
    let amounts = [];
    let cnt = 1;
    for (let i = 0; i < cnt; i++) {
      amounts.push(stake);
      codes.push(i);
    }
    res = await jackpot.methods.stakeIn(codes, amounts).send({ from: accounts[0], value: stake * cnt, gas: 10000000 });
    console.log('gasUsed:', res.gasUsed);
    console.log('events:', res.events);
    // assert.equal(res.events.PoolUpdate.returnValues.demandDepositPool, web3.utils.toWei('590').toString());

    let ret = await jackpot.methods.stakerInfoMap(accounts[0]).call();
    console.log(ret);
    assert.equal(ret.codeCount, '54');

    ret = await jackpot.methods.codesMap(1111).call();
    assert.equal(ret, '2');

    res = await jackpot.methods.stakeOut(codes).send({ from: accounts[0], value: 0, gas: 10000000 });
    console.log('events:', res.events);

    console.log('gasUsed:', res.gasUsed);
    ret = await jackpot.methods.stakerInfoMap(accounts[0]).call();
    // console.log(ret);
    // console.log(web3.utils.fromWei(await getWeb3().eth.getBalance(accounts[0])));
    assert.equal(ret.codeCount, '4');
  });

  return;

  it('stakeIn failed when codes and amount length not match', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount length == 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], []).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount < 10', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [web3.utils.toWei('5'), stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount % 10 != 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [web3.utils.toWei('25'), stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount length > codes length', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake, stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when value not match amount', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when codes larger than maxDigital', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([11111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when codes length == 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when amount length > 50', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      let codes = [];
      let amounts = [];
      for (let i = 0; i < 51; i++) {
        amounts.push(stake);
        codes.push(i);
      }
      await jackpot.methods.stakeIn(codes, amounts).send({ from: accounts[0], value: stake * 51, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeIn failed when codes length > 50', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      let codes = [];
      let amounts = [];
      for (let i = 0; i < 51; i++) {
        amounts.push(stake);
        codes.push(i);
      }
      await jackpot.methods.stakeIn(codes, amounts).send({ from: accounts[0], value: stake * 51, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeOut success when demandDepositPool is enough', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    let balance0 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let res = await jackpot.methods.stakeIn([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
    assert.equal(res.status, true);
    let balance1 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let value = new BigNumber(stake * 2);
    let gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    assert.equal(balance0.toString(), (balance1.plus(value).plus(gas)).toString());

    res = await jackpot.methods.stakeOut([1111, 2222]).send({ from: accounts[0], value: 0, gas: 10000000, gasPrice });
    assert.equal(res.status, true);
    assert.equal(res.events.StakeOut.returnValues.success, true);

    gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    let balance2 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    assert.equal(balance1.plus(value).toString(), balance2.plus(gas).toString());
  });

  it('stakeOut failed when codes length > 100', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
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
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut([0]).send({ from: accounts[0], value: 1, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/non-payable/));
    }
  });

  it('stakeOut failed when codes have same number', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut([0, 0]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeOut failed when codes value too large', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut([11110, 0]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('stakeOut failed when codes length == 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.stakeIn([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.stakeOut([]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  // it('should failed when normal transfer to sc', async () => {
  //   let jackpot = (await getContracts(accounts)).jackpot;
  //   try {
  //     await getWeb3().eth.sendTransaction({ from: accounts[0], value: 1, to: jackpot._address });
  //     assert(false, 'Should never get here');
  //   } catch (e) {
  //     console.log(e);
  //     assert.ok(e.message.match(/revert/));
  //   }
  // });

  it('should failed for owner call open and close', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.open().send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.close().send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed for non-operator call open and close', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.open().send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.close().send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed call setOperator for non-owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[2], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed call setOperator 0 for owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setOperator('0x0000000000000000000000000000000000000000').send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success call setOperator for owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    let res = await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });
    assert.equal(res.status, true);
  });

  it('should success for operator call open and close', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });
    await jackpot.methods.close().send({ from: accounts[1], value: 0, gas: 10000000 });

    let ret = await jackpot.methods.closed().call();
    assert.equal(ret, true);

    await jackpot.methods.open().send({ from: accounts[1], value: 0, gas: 10000000 });

    ret = await jackpot.methods.closed().call();
    assert.equal(ret, false);

  });

  it('should failed stakeIn and stakeOut after close', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });

    await jackpot.methods.stakeIn([1], [stake]).send({ from: accounts[3], value: stake, gas: 10000000 });

    await jackpot.methods.close().send({ from: accounts[1], value: 0, gas: 10000000 });

    try {
      await jackpot.methods.stakeIn([1], [stake]).send({ from: accounts[2], value: stake, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeOut([1]).send({ from: accounts[3], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success stakeIn and stakeOut after open', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });

    await jackpot.methods.stakeIn([1], [stake]).send({ from: accounts[3], value: stake, gas: 10000000 });

    await jackpot.methods.close().send({ from: accounts[1], value: 0, gas: 10000000 });

    try {
      await jackpot.methods.stakeIn([1], [stake]).send({ from: accounts[2], value: stake, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.stakeOut([1]).send({ from: accounts[3], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    await jackpot.methods.open().send({ from: accounts[1], value: 0, gas: 10000000 });

    await jackpot.methods.stakeIn([1], [stake]).send({ from: accounts[2], value: stake, gas: 10000000 });

    await jackpot.methods.stakeOut([1]).send({ from: accounts[3], value: 0, gas: 10000000 });

  });

  it('should failed call update for non-operator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.update().send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success call update for operator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });
    let res = await jackpot.methods.update().send({ from: accounts[1], value: 0, gas: 10000000 });

    await getWeb3().eth.sendTransaction({ from: accounts[1], to: jackpot._address, value: web3.utils.toWei('100') });

    res = await jackpot.methods.update().send({ from: accounts[1], value: 0, gas: 10000000 });

    // assert.equal(res.events.PoolUpdate.returnValues.prizePool, web3.utils.toWei('100').toString());

    // console.log(JSON.stringify(res, null, 4));
  });

  it('should failed setValidator for non-operator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setValidator('0xa4626e2bb450204c4b34bcc7525e585e8f678c0d').send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed setValidator 0 for operator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    let res = await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });

    try {
      await jackpot.methods.setValidator('0x0000000000000000000000000000000000000000').send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success setValidator for operator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    let res = await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });

    await jackpot.methods.setValidator('0xa4626e2bb450204c4b34bcc7525e585e8f678c0d').send({ from: accounts[1], value: 0, gas: 10000000 });

    let ret = await jackpot.methods.validatorsInfo().call();
    assert.equal('0xa4626e2bb450204c4b34bcc7525e585e8f678c0d', ret.currentValidator.toLowerCase());
  });

  it('should failed setFeeRate for non-owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setFeeRate(100).send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed setFeeRate > 1000 for owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setFeeRate(1001).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success setFeeRate for owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setFeeRate(100).send({ from: accounts[0], value: 0, gas: 10000000 });

    let ret = await jackpot.methods.feeRate().call();
    assert.equal('100', ret);
  });

  it('should failed setDelegatePercent for non-owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setDelegatePercent(500).send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed setDelegatePercent > 1000 for owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setDelegatePercent(1100).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success setDelegatePercent for owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setDelegatePercent(500).send({ from: accounts[0], value: 0, gas: 10000000 });

    let ret = await jackpot.methods.poolInfo().call();
    assert.equal('500', ret.delegatePercent);
  });

  it('should failed setMaxDigital for non-owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setMaxDigital(10).send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success setMaxDigital for owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setMaxDigital(10).send({ from: accounts[0], value: 0, gas: 10000000 });

    let ret = await jackpot.methods.maxDigital().call();
    assert.equal('10', ret);
  });

  it('should failed setMaxDigital 0 for owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.setMaxDigital(0).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed runDelegateIn for non-operator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.runDelegateIn().send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed runDelegateIn for operator non-default-validator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });
    try {
      await jackpot.methods.runDelegateIn().send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success runDelegateIn for operator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });
    await jackpot.methods.setValidator('0xa4626e2bb450204c4b34bcc7525e585e8f678c0d').send({ from: accounts[1], value: 0, gas: 10000000 });
    let res = await jackpot.methods.stakeIn([0], [stake]).send({ from: accounts[2], value: stake, gas: 10000000 });
    // console.log(res.gasUsed);
    let ret = await jackpot.methods.runDelegateIn().send({ from: accounts[1], value: 0, gas: 10000000 });
    // console.log(JSON.stringify(ret, null, 4));
    // console.log(await jackpot.methods.validatorInfo().call());
  });

  it('should failed runDelegateOut for non-owner', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.runDelegateOut('0xa4626e2bb450204c4b34bcc7525e585e8f678c0d').send({ from: accounts[1], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should failed runDelegateOut for owner bad validator', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.runDelegateOut('0xa4626e2bb450204c4b34bcc7525e585e8f678c0d').send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success lotterySettlement', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], gas: 1e7 });
    let res = await jackpot.methods.lotterySettlement().send({ from: accounts[1], gas: 1e7 });
    
    await jackpot.methods.stakeIn([1904], [stake]).send({ from: accounts[0], gas: 1e7, value: stake });
    await jackpot.methods.stakeIn([1904], [stake2]).send({ from: accounts[1], gas: 1e7, value: stake2 });
    await jackpot.methods.stakeIn([1904], [stake3]).send({ from: accounts[2], gas: 1e7, value: stake3 });
    await jackpot.methods.stakeIn([1904], [stake4]).send({ from: accounts[3], gas: 1e7, value: stake4 });
    await jackpot.methods.stakeIn([1904], [stake]).send({ from: accounts[4], gas: 1e7, value: stake });

    res = await jackpot.methods.lotterySettlement().send({ from: accounts[1], gas: 1e7 });

    await jackpot.methods.setFeeRate(100).send({ from: accounts[0], value: 0, gas: 10000000 });
    await getWeb3().eth.sendTransaction({ from: accounts[1], to: jackpot._address, value: stake });
    await jackpot.methods.update().send({ from: accounts[1], gas: 1e7 });
    res = await jackpot.methods.lotterySettlement().send({ from: accounts[1], gas: 1e7 });
    // console.log(JSON.stringify(res, null, 4));
  });

  it('should failed subsidyIn < 10', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.subsidyIn().send({ from: accounts[0], value: web3.utils.toWei('5'), gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success subsidyIn >= 10', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.subsidyIn().send({ from: accounts[0], value: stake, gas: 10000000 });
    let ret = await jackpot.methods.subsidyInfo().call();
    assert.equal(ret.total, stake.toString());
  });

  it('should failed subsidyOut non-in', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.subsidyOut(stake).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success subsidyOut with subsidyIn >= 10', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.subsidyIn().send({ from: accounts[0], value: stake, gas: 10000000 });
    await jackpot.methods.subsidyOut(stake).send({ from: accounts[0], value: 0, gas: 10000000 });
    let ret = await jackpot.methods.subsidyInfo().call();
    assert.equal(ret.total, stake.toString());
    assert.equal(ret.refundingCount, 1);
    await jackpot.methods.setOperator(accounts[0]).send({ from: accounts[0], value: 0, gas: 10000000 });
    await jackpot.methods.update().send({ from: accounts[0], value: 0, gas: 10000000 });
    ret = await jackpot.methods.poolInfo().call();
    // console.log(ret);
  });

  it('should failed subsidyOut again', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.subsidyIn().send({ from: accounts[0], value: stake, gas: 10000000 });
    await jackpot.methods.subsidyOut(stake).send({ from: accounts[0], value: 0, gas: 10000000 });
    let ret = await jackpot.methods.subsidyInfo().call();
    assert.equal(ret.total, stake.toString());
    assert.equal(ret.refundingCount, 1);
    try {
      await jackpot.methods.subsidyOut(stake).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

});
