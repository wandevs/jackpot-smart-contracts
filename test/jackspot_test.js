const assert = require('assert');
const { getContracts, getWeb3, getContractsWithoutDelegate, resAssert, getTestHelper } = require('./utils');
const BigNumber = require('bignumber.js');

const stake = web3.utils.toWei('10');
const stake2 = web3.utils.toWei('20');
const stake3 = web3.utils.toWei('30');
const stake4 = web3.utils.toWei('40');
const stake500 = web3.utils.toWei('500');
const stake300 = web3.utils.toWei('300');

const gasPrice = 180e9;


contract('JacksPot', accounts => {
  before(async () => {
  });

  it('buy success when codes and amounts are correct', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    // console.log(web3.utils.fromWei(await getWeb3().eth.getBalance(accounts[0])));

    let balance0 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let res = await jackpot.methods.buy([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
    console.log('gasUsed:', res.gasUsed);
    // console.log(res.events.Buy.returnValues, await jackpot.methods.userInfoMap(accounts[0]).call());
    assert.equal(res.status, true);
    let balance1 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let value = new BigNumber(stake * 2);
    let gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    assert.equal(balance0.toString(), (balance1.plus(value).plus(gas)).toString());

    let balance = await getWeb3().eth.getBalance(jackpot._address);
    assert.equal(balance, stake * 2);

    res = await (jackpot.methods.buy([3333, 1234, 0], [stake, stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 }));
    // res = await debug(jackpot.methods.buy([3333, 1234, 0], [stake, stake, stake], { from: accounts[0], value: stake * 3, gas: 10000000 }));

    // console.log('events:', res.events);
    console.log('gasUsed:', res.gasUsed);
    assert.equal(res.status, true);

    balance = await getWeb3().eth.getBalance(jackpot._address);
    assert.equal(balance, stake * 5);

    // assert.equal(res.events.Buy.returnValues.codes.toString(), [3333, 1234, 0].toString());

    res = await jackpot.methods.buy([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
    // console.log('events:', res.events);

    console.log('gasUsed:', res.gasUsed);
    assert.equal(res.status, true);

    res = await jackpot.methods.buy([1111, 2222], [stake, stake]).send({ from: accounts[accounts.length - 1], value: stake * 2, gas: 10000000 });
    // console.log('events:', res.events);

    console.log('gasUsed:', res.gasUsed);
    assert.equal(res.status, true);

    let codes = [];
    let amounts = [];
    let cnt = 46;
    for (let i = 0; i < cnt; i++) {
      amounts.push(stake);
      codes.push(i);
    }
    res = await jackpot.methods.buy(codes, amounts).send({ from: accounts[0], value: stake * cnt, gas: 10000000 });
    console.log('gasUsed:', res.gasUsed);
    // console.log('events:', res.events);
    // assert.equal(res.events.PoolUpdate.returnValues.demandDepositPool, web3.utils.toWei('590').toString());

    let ret = await jackpot.methods.userInfoMap(accounts[0]).call();
    console.log(ret);
    assert.equal(ret.codeCount, '50');

    ret = await jackpot.methods.getUserCodeList(accounts[0]).call();
    // console.log(ret);
    assert.equal(ret.amounts[0], '20000000000000000000');

    ret = await jackpot.methods.indexCodeMap(1111).call();
    assert.equal(ret, '2');

    res = await jackpot.methods.redeem(codes).send({ from: accounts[0], value: 0, gas: 10000000 });
    // console.log('events:', res.events);

    console.log('gasUsed:', res.gasUsed);
    ret = await jackpot.methods.userInfoMap(accounts[0]).call();
    // console.log(ret);
    // console.log(web3.utils.fromWei(await getWeb3().eth.getBalance(accounts[0])));
    assert.equal(ret.codeCount, '4');
  });

  it('buy failed when codes and amount length not match', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([1111, 2222], [stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when codes not number', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy(['a', 'b'], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      // assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when amount length == 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([1111, 2222], []).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when amount < 10', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([1111, 2222], [web3.utils.toWei('5'), stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when amount % 10 != 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([1111, 2222], [web3.utils.toWei('25'), stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when amount length > codes length', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([1111, 2222], [stake, stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when value not match amount', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 3, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when codes larger than maxDigital', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([11111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when codes length == 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when amount length > 50', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      let codes = [];
      let amounts = [];
      for (let i = 0; i < 51; i++) {
        amounts.push(stake);
        codes.push(i);
      }
      await jackpot.methods.buy(codes, amounts).send({ from: accounts[0], value: stake * 51, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('buy failed when codes length > 50', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      let codes = [];
      let amounts = [];
      for (let i = 0; i < 51; i++) {
        amounts.push(stake);
        codes.push(i);
      }
      await jackpot.methods.buy(codes, amounts).send({ from: accounts[0], value: stake * 51, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('redeem success when demandDepositPool is enough', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    let balance0 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let res = await jackpot.methods.buy([1111, 2222], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
    assert.equal(res.status, true);
    let balance1 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    let value = new BigNumber(stake * 2);
    let gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    assert.equal(balance0.toString(), (balance1.plus(value).plus(gas)).toString());

    res = await jackpot.methods.redeem([1111, 2222]).send({ from: accounts[0], value: 0, gas: 10000000, gasPrice });
    assert.equal(res.status, true);
    assert.equal(res.events.Redeem.returnValues.success, true);

    gas = new BigNumber(res.gasUsed);
    gas = gas.multipliedBy(gasPrice);

    let balance2 = new BigNumber(await getWeb3().eth.getBalance(accounts[0]));
    assert.equal(balance1.plus(value).toString(), balance2.plus(gas).toString());
  });

  it('redeem failed when codes length > 100', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      let codes = [];
      for (let i = 0; i < 101; i++) {
        codes.push(i);
      }
      await jackpot.methods.buy([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.redeem(codes).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('redeem failed when value != 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.redeem([0]).send({ from: accounts[0], value: 1, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/non-payable/));
    }
  });

  it('redeem failed when codes have same number', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.redeem([0, 0]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('redeem failed when codes value too large', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.redeem([11110, 0]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('redeem failed when codes length == 0', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    try {
      await jackpot.methods.buy([0, 1], [stake, stake]).send({ from: accounts[0], value: stake * 2, gas: 10000000, gasPrice });
      await jackpot.methods.redeem([]).send({ from: accounts[0], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

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

  it('should failed buy and redeem after close', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });

    await jackpot.methods.buy([1], [stake]).send({ from: accounts[3], value: stake, gas: 10000000 });

    await jackpot.methods.close().send({ from: accounts[1], value: 0, gas: 10000000 });

    try {
      await jackpot.methods.buy([1], [stake]).send({ from: accounts[2], value: stake, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.redeem([1]).send({ from: accounts[3], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
  });

  it('should success buy and redeem after open', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], value: 0, gas: 10000000 });

    await jackpot.methods.buy([1], [stake]).send({ from: accounts[3], value: stake, gas: 10000000 });

    await jackpot.methods.close().send({ from: accounts[1], value: 0, gas: 10000000 });

    try {
      await jackpot.methods.buy([1], [stake]).send({ from: accounts[2], value: stake, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await jackpot.methods.redeem([1]).send({ from: accounts[3], value: 0, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    await jackpot.methods.open().send({ from: accounts[1], value: 0, gas: 10000000 });

    await jackpot.methods.buy([1], [stake]).send({ from: accounts[2], value: stake, gas: 10000000 });

    await jackpot.methods.redeem([1]).send({ from: accounts[3], value: 0, gas: 10000000 });

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
    let res = await jackpot.methods.buy([0], [stake]).send({ from: accounts[2], value: stake, gas: 10000000 });
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
    await jackpot.methods.close().send({ from: accounts[1], gas: 1e7 });
    let res = await jackpot.methods.lotterySettlement().send({ from: accounts[1], gas: 1e7 });
    await jackpot.methods.open().send({ from: accounts[1], gas: 1e7 });


    await jackpot.methods.buy([1904], [stake]).send({ from: accounts[0], gas: 1e7, value: stake });
    await jackpot.methods.buy([1904], [stake2]).send({ from: accounts[1], gas: 1e7, value: stake2 });
    await jackpot.methods.buy([1904], [stake3]).send({ from: accounts[2], gas: 1e7, value: stake3 });
    await jackpot.methods.buy([1904], [stake4]).send({ from: accounts[3], gas: 1e7, value: stake4 });
    await jackpot.methods.buy([1904], [stake]).send({ from: accounts[4], gas: 1e7, value: stake });

    await jackpot.methods.close().send({ from: accounts[1], gas: 1e7 });

    res = await jackpot.methods.lotterySettlement().send({ from: accounts[1], gas: 1e7 });
    await jackpot.methods.open().send({ from: accounts[1], gas: 1e7 });

    await jackpot.methods.setFeeRate(100).send({ from: accounts[0], value: 0, gas: 10000000 });
    await getWeb3().eth.sendTransaction({ from: accounts[1], to: jackpot._address, value: stake });
    await jackpot.methods.update().send({ from: accounts[1], gas: 1e7 });

    await jackpot.methods.close().send({ from: accounts[1], gas: 1e7 });

    res = await jackpot.methods.lotterySettlement().send({ from: accounts[1], gas: 1e7 });

    await jackpot.methods.open().send({ from: accounts[1], gas: 1e7 });

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

  it('should success get implementation address', async () => {
    let sc = (await getContracts(accounts));
    let jackpotProxy = sc.jackpotProxy;
    let jackpotDelegate = sc.jackpotDelegate;

    let ret = await jackpotProxy.methods.implementation().call();
    console.log(ret);
    assert.equal(jackpotDelegate._address, ret);
  });

  it('should failed when implementation not set', async () => {
    try {
      let sc = (await getContractsWithoutDelegate(accounts));
      let jackpotProxy = sc.jackpotProxy;
      let jackpot = sc.jackpot;
      let ret = await jackpotProxy.methods.implementation().call();
      console.log(ret);
      await jackpot.methods.subsidyIn().send({ from: accounts[0], value: stake, gas: 10000000 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

  });

  it('should success WorkFlow', async () => {
    let jackpot = (await getContracts(accounts)).jackpot;
    const testHelper = await getTestHelper();
    let res = {};
    let ret = {};
    // Set operator
    await jackpot.methods.setOperator(accounts[1]).send({ from: accounts[0], gas: 1e7 });

    // Set test pos sc address
    await jackpot.methods.setRandomPrecompileAddress(testHelper._address).send({ from: accounts[0], gas: 1e7 });
    await jackpot.methods.setPosPrecompileAddress(testHelper._address).send({ from: accounts[0], gas: 1e7 });
    ret = await jackpot.methods.posPrecompileAddress().call();
    assert.equal(ret, testHelper._address);
    ret = await jackpot.methods.randomPrecompileAddress().call();
    assert.equal(ret, testHelper._address);

    // set validator
    await jackpot.methods.setValidator(accounts[0]).send({ from: accounts[1], gas: 1e7 });


    // buy
    res = await jackpot.methods.buy([0], [stake]).send({ from: accounts[2], value: stake, gas: 1e7 });
    resAssert(res, 192250, 'Buy', 'stakeAmount', stake.toString());
    res = await jackpot.methods.buy([1], [stake2]).send({ from: accounts[2], value: stake2, gas: 1e7 });
    resAssert(res, 176872, 'Buy', 'stakeAmount', stake2.toString());
    res = await jackpot.methods.buy([6666], [stake300]).send({ from: accounts[4], value: stake300, gas: 1e7 });
    resAssert(res, 191936, 'Buy', 'stakeAmount', stake300.toString());

    // update balance
    res = await jackpot.methods.update().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 38355, 'UpdateSuccess');

    // check poolInfo
    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '330000000000000000000');

    // redeem
    res = await jackpot.methods.redeem([1]).send({ from: accounts[2], gas: 1e7 });
    resAssert(res, 56771, 'Redeem', 'success', true);

    // check poolInfo
    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '310000000000000000000');

    // update balance
    res = await jackpot.methods.update().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 38355, 'UpdateSuccess');

    // delegateIn
    res = await jackpot.methods.runDelegateIn().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 177101, 'DelegateIn', 'amount', '217000000000000000000');

    // check pos sc balance
    ret = await getWeb3().eth.getBalance(testHelper._address);
    assert.equal(ret, '217000000000000000000');

    // check pos sc amount
    ret = await testHelper.methods.delegateAmountMap(accounts[0]).call();
    assert.equal(ret, '217000000000000000000');

    // check poolInfo
    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '93000000000000000000');

    res = await jackpot.methods.redeem([6666]).send({ from: accounts[4], gas: 1e7 });
    resAssert(res, 122765, 'Redeem', 'success', false);

    ret = await jackpot.methods.getPendingAmount().call();
    assert.equal(ret, stake300.toString());

    // check poolInfo
    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '93000000000000000000');

    res = await jackpot.methods.subsidyIn().send({ from: accounts[5], value: stake300 });
    resAssert(res, 81073);

    // check poolInfo
    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '393000000000000000000');

    // update balance
    res = await jackpot.methods.update().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 56383, 'UpdateSuccess');

    // check poolInfo
    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '93000000000000000000');

    ret = await jackpot.methods.getPendingAmount().call();
    assert.equal(ret, '0');

    try {
      // subsidy out should failed when nothing in.
      res = await jackpot.methods.subsidyOut(stake).send({ from: accounts[4], gas: 1e7 })
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    // subsidy out require.
    res = await jackpot.methods.subsidyOut(stake).send({ from: accounts[5], gas: 1e7 })
    resAssert(res, 96961);

    ret = await jackpot.methods.getPendingAmount().call();
    assert.equal(ret, stake);

    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '93000000000000000000');

    res = await jackpot.methods.update().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 56088, 'UpdateSuccess');
    resAssert(res, 56088, 'SubsidyRefund', 'refundAddress', accounts[5]);
    resAssert(res, 56088, 'SubsidyRefund', 'amount', stake);

    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '83000000000000000000');

    let codes = [];
    let amounts = [];
    for (let i = 0; i < 50; i++) {
      codes.push(i);
      amounts.push(stake);
    }
    // buy
    res = await jackpot.methods.buy(codes, amounts).send({ from: accounts[6], value: stake500, gas: 1e7 });
    resAssert(res, 6620675, 'Buy', 'stakeAmount', stake500.toString());
    // console.log(JSON.stringify(res, null, 4));

    ret = await jackpot.methods.getUserCodeList(accounts[6]).call();
    for (let i = 0; i < 50; i++) {
      assert.equal(ret.codes[i], codes[i].toString());
      assert.equal(ret.amounts[i], amounts[i].toString());
    }

    codes = [];
    for (let i = 2; i < 50; i += 2) {
      codes.push(i);
    }

    res = await jackpot.methods.redeem(codes).send({ from: accounts[6], gas: 1e7 });
    resAssert(res, 700234, 'Redeem', 'success', true);

    try {
      await jackpot.methods.redeem(codes).send({ from: accounts[6], gas: 1e7 });
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    codes = [];
    for (let i = 0; i < 50; i++) {
      codes.push(i);
    }

    ret = await jackpot.methods.getUserCodeList(accounts[6]).call();
    assert.equal(ret.codes.length, 26);
    assert.equal(ret.codes[0], codes[0].toString());
    assert.equal(ret.amounts[0], amounts[0].toString());

    for (let i = 0; i < 25; i++) {
      assert.equal(ret.codes.includes(codes[i * 2 + 1].toString()), true, i + 1);
      assert.equal(amounts[i * 2 + 1].toString(), ret.amounts[i + 1], i + 1);
    }

    // update balance
    res = await jackpot.methods.update().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 38355, 'UpdateSuccess');

    ret = await testHelper.methods.delegateAmountMap(accounts[0]).call();
    assert.equal(ret, '217000000000000000000');

    // check pos sc balance
    ret = await getWeb3().eth.getBalance(testHelper._address);
    assert.equal(ret, '217000000000000000000');

    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '343000000000000000000');

    // delegateOut
    res = await jackpot.methods.runDelegateOut(accounts[0]).send({ from: accounts[1], gas: 1e7 });


    resAssert(res, 38351, 'DelegateOut', 'amount', '217000000000000000000');

    ret = await testHelper.methods.delegateAmountMap(accounts[0]).call();
    assert.equal(ret, '0');

    // check pos sc balance
    ret = await getWeb3().eth.getBalance(testHelper._address);
    assert.equal(ret, '0');

    res = await jackpot.methods.update().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 38355, 'UpdateSuccess');

    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.demandDepositPool, '560000000000000000000');

    ret = await jackpot.methods.subsidyInfo().call();
    assert.equal(ret.total, '290000000000000000000');

    res = await jackpot.methods.runDelegateIn().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 177101, 'DelegateIn', 'amount', '189000000000000000000');

    //----------Test lottery price------------
    await getWeb3().eth.sendTransaction({ from: accounts[0], to: jackpot._address, value: web3.utils.toWei('3500') });

    res = await jackpot.methods.update().send({ from: accounts[1] });
    resAssert(res, 60290, 'UpdateSuccess');

    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.prizePool, '3500000000000000000000');

    res = await jackpot.methods.buy([6666], [stake]).send({ from: accounts[3], value: stake, gas: 1e7 });
    resAssert(res, 191937, 'Buy', 'stakeAmount', stake);

    res = await jackpot.methods.close().send({ from: accounts[1], gas: 1e7 });

    res = await jackpot.methods.lotterySettlement().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 86062, 'RandomGenerate', 'random', '6666');
    resAssert(res, 86062, 'LotteryResult', 'prizePool', '3500000000000000000000');

    res = await jackpot.methods.open().send({ from: accounts[1], gas: 1e7 });

    ret = await jackpot.methods.userInfoMap(accounts[3]).call();
    assert.equal(ret.prize, "3500000000000000000000");

    let balance = web3.utils.fromWei(await getWeb3().eth.getBalance(accounts[3]));

    res = await jackpot.methods.prizeWithdraw().send({ from: accounts[3], gas: 1e7 });
    resAssert(res, 41495, 'PrizeWithdraw', 'success', true);

    let balance2 = web3.utils.fromWei(await getWeb3().eth.getBalance(accounts[3]));

    assert.equal(Number(balance2) > Number(balance), true);

    assert.equal(Math.abs((Number(balance2) - Number(balance)) - 3500) < 2, true);

    //----------Test lottery price------------
    await getWeb3().eth.sendTransaction({ from: accounts[0], to: jackpot._address, value: web3.utils.toWei('350000') });

    res = await jackpot.methods.update().send({ from: accounts[1] });
    resAssert(res, 60290, 'UpdateSuccess');

    ret = await jackpot.methods.poolInfo().call();
    assert.equal(ret.prizePool, '350000000000000000000000');

    res = await jackpot.methods.buy([6666], [stake]).send({ from: accounts[3], value: stake, gas: 1e7 });
    resAssert(res, 191937, 'Buy', 'stakeAmount', stake);

    res = await jackpot.methods.close().send({ from: accounts[1], gas: 1e7 });

    res = await jackpot.methods.lotterySettlement().send({ from: accounts[1], gas: 1e7 });
    resAssert(res, 86062, 'RandomGenerate', 'random', '6666');
    resAssert(res, 86062, 'LotteryResult', 'prizePool', '350000000000000000000000');

    res = await jackpot.methods.open().send({ from: accounts[1], gas: 1e7 });

    ret = await jackpot.methods.userInfoMap(accounts[3]).call();
    assert.equal(ret.prize, "350000000000000000000000");

    balance = web3.utils.fromWei(await getWeb3().eth.getBalance(accounts[3]));

    await jackpot.methods.subsidyOut('290000000000000000000').send({from: accounts[5], gas: 1e7});

    await jackpot.methods.runDelegateIn().send({from:accounts[1], gas:1e7});

    res = await jackpot.methods.update().send({ from: accounts[1], gas:1e7 });
    resAssert(res, 60290, 'UpdateSuccess');

    res = await jackpot.methods.prizeWithdraw().send({ from: accounts[3], gas: 1e7 });
    resAssert(res, 41495, 'PrizeWithdraw', 'success', false);

    ret = await jackpot.methods.getPendingAmount().call();
    console.log('getPendingAmount:', ret);

    balance2 = web3.utils.fromWei(await getWeb3().eth.getBalance(accounts[3]));

    assert.equal(Number(balance2) < Number(balance), true);

    res = await jackpot.methods.update().send({ from: accounts[1], gas:1e7 });

    res = await jackpot.methods.runDelegateOut(accounts[0]).send({from: accounts[1], gas: 1e7});

    resAssert(res, 38351, 'DelegateOut', 'amount', '245203000000000000000000');

    res = await jackpot.methods.update().send({ from: accounts[1], gas:1e7 });

    resAssert(res, 60290, 'UpdateSuccess');

    // await jackpot.methods.setValidator(accounts[1]).send({ from: accounts[1], gas: 1e7 });
    // await jackpot.methods.runDelegateIn().send({from:accounts[1], gas:1e7});
    // res = await jackpot.methods.runDelegateOut(accounts[1]).send({from: accounts[1], gas: 1e7});


    //-----------------
    console.log('gas used:', res.gasUsed);
    console.log(res.events);

    ret = await jackpot.methods.poolInfo().call();
    console.log('poolInfo:', ret);
  });

  it("should success 100 address buy 1 code and win", async () => {

  });
});
