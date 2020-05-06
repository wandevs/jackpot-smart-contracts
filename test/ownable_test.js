const assert = require('assert');
const { getContracts, fullTest } = require('./utils');

contract('Ownable', accounts => {

  before(async () => {

  });

  if (!fullTest) {
    return;
  }

  it('should return true when caller is owner', async () => {
    const jackpot = (await getContracts(accounts)).jackpot;

    const isOwner = await jackpot.methods.isOwner().call({ from: accounts[0] });
    assert.equal(true, isOwner);
  });

  it('should return owner', async () => {
    const jackpot = (await getContracts(accounts)).jackpot;

    let owner = await jackpot.methods.owner().call({ from: accounts[0] });
    assert.equal(accounts[0].toLowerCase(), owner.toLowerCase());

    // Should also return the owner properly when called by a non owner account
    owner = await jackpot.methods.owner().call({ from: accounts[2] });
    assert.equal(accounts[0].toLowerCase(), owner.toLowerCase());
  });

  it("should return false when caller isn't owner", async () => {
    const jackpot = (await getContracts(accounts)).jackpot;

    const isOwner = await jackpot.methods.isOwner().call({ from: accounts[2] });
    assert.equal(false, isOwner);
  });

  it('should transfer ownership', async () => {
    const jackpot = (await getContracts(accounts)).jackpot;

    await jackpot.methods.transferOwnership(accounts[3]).send({ from: accounts[0] });
    let isOwner = await jackpot.methods.isOwner().call({ from: accounts[3] });
    assert.equal(true, isOwner);

    // Old owner will no longer be considered the owner
    isOwner = await jackpot.methods.isOwner().call({ from: accounts[0] });
    assert.equal(false, isOwner);
  });

  it("can't transfer ownership to empty address", async () => {
    const jackpot = (await getContracts(accounts)).jackpot;

    try {
      await jackpot.methods
        .transferOwnership('0x0000000000000000000000000000000000000000')
        .send({ from: accounts[0] });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
      return;
    }

    assert(false, 'Should never get here');
  });

  it("can't transfer ownership if not owner", async () => {
    const jackpot = (await getContracts(accounts)).jackpot;

    try {
      await jackpot.methods.transferOwnership(accounts[3]).send({ from: accounts[3] });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
      return;
    }

    assert(false, 'Should never get here');
  });

  it('should have no owner after renouncing', async () => {
    const jackpot = (await getContracts(accounts)).jackpot;
    let owner = await jackpot.methods.owner().call({ from: accounts[0] });
    await jackpot.methods.renounceOwnership().send({ from: accounts[0] });
    owner = await jackpot.methods.owner().call({ from: accounts[0] });
    assert.equal('0x0000000000000000000000000000000000000000', owner);
  });

  it('should revert when trying to renounce but not owner', async () => {
    const jackpot = (await getContracts(accounts)).jackpot;

    try {
      await jackpot.methods.renounceOwnership().send({ from: accounts[1] });
    } catch (e) {
      assert.ok(e.message.match(/revert/));
      return;
    }

    assert(false, 'Should never get here');
  });
});
