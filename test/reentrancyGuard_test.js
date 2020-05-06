const assert = require('assert');
const { getTestHelper, fullTest } = require('./utils');

contract('Ownable', accounts => {

    before(async () => {

    });

    if (!fullTest) {
        // return;
    }

    it('should failed when call reEntrancyTest storage method', async () => {
        try {
            const testHelper = await getTestHelper();
            let res = await testHelper.methods.reentrancyTest().send({ from: accounts[0], value: web3.utils.toWei("10") });
            console.log(res);

            console.log(await testHelper.methods.testBalance().call());

        } catch (e) {
            assert.ok(e.message.match(/revert/));
        }
    });

});
