const assert = require('assert');
const lib = require("./lib");
const { getTestBasicStorage, fullTest } = require('./utils');


contract('BasicStorage', async (accounts) => {
  let testBasicStorage;
  before("init contracts", async() => {
    testBasicStorage = await getTestBasicStorage();
  });

  if (!fullTest) {
    return;
  }

  it ('set/get/delete uint data, it should success', async() => {
    let uintData = "99999999";
    try {
      let key = await web3.utils.hexToBytes(await web3.utils.toHex("testData"));
      let innerkey = await web3.utils.hexToBytes(await web3.utils.toHex("uintData"));

      await testBasicStorage.methods.setUintData(key, innerkey, uintData).send({from: accounts[0]});
      let data = await testBasicStorage.methods.getUintData(key, innerkey).call();
      lib.assertCommonEqual(uintData, data.toString(10));

      await testBasicStorage.methods.delUintData(key, innerkey).send({from: accounts[0]});
      data = await testBasicStorage.methods.getUintData(key, innerkey).call();
      lib.assertNotDeepEqual(uintData, data.toString(10));
    } catch (err) {
      lib.assertFail(err);
    }
  });

  it ('set out of range uint data, it should throw error', async() => {
    let uintData = "999999999999999999999999999999999999";
    try {
      let key = await web3.utils.hexToBytes(await web3.utils.toHex("testData"));
      let innerkey = await web3.utils.hexToBytes(await web3.utils.toHex("uintData"));

      await testBasicStorage.methods.setUintData(key, innerkey, uintData).send({from: accounts[0]});;
    } catch (err) {
      lib.assertFail(err);
    }
  });

  it ('set/get/delete bool data, it should success', async() => {
    let boolData = true;
    try {
      let key = await web3.utils.hexToBytes(await web3.utils.toHex("testData"));
      let innerkey = await web3.utils.hexToBytes(await web3.utils.toHex("boolData"));

      await testBasicStorage.methods.setBoolData(key, innerkey, boolData).send({from: accounts[0]});;
      let data = await testBasicStorage.methods.getBoolData(key, innerkey).call();
      lib.assertCommonEqual(boolData, data);
      await testBasicStorage.methods.delBoolData(key, innerkey).send({from: accounts[0]});;
      data = await testBasicStorage.methods.getBoolData(key, innerkey).call();
      lib.assertNotDeepEqual(boolData, data);
    } catch (err) {
      lib.assertFail(err);
    }
  });

  it ('set/get/delete address data, it should success', async() => {
    let addressData = accounts[0];
    try {
      let key = await web3.utils.hexToBytes(await web3.utils.toHex("testData"));
      let innerkey = await web3.utils.hexToBytes(await web3.utils.toHex("addressData"));

      await testBasicStorage.methods.setAddressData(key, innerkey, addressData).send({from: accounts[0]});;
      let data = await testBasicStorage.methods.getAddressData(key, innerkey).call();
      lib.assertCommonEqual(addressData, data);
      await testBasicStorage.methods.delAddressData(key, innerkey).send({from: accounts[0]});;
      data = await testBasicStorage.methods.getAddressData(key, innerkey).call();
      lib.assertNotDeepEqual(addressData, data);
    } catch (err) {
      lib.assertFail(err);;
    }
  });

  it ('set/get/delete bytes data, it should success', async() => {
    let bytesData = accounts[0];
    try {
      let key = await web3.utils.hexToBytes(await web3.utils.toHex("testData"));
      let innerkey = await web3.utils.hexToBytes(await web3.utils.toHex("bytesData"));

      await testBasicStorage.methods.setBytesData(key, innerkey, bytesData).send({from: accounts[0]});;
      let data = await testBasicStorage.methods.getBytesData(key, innerkey).call();
      lib.assertCommonEqual(bytesData.toLowerCase(), data.toLowerCase());
      await testBasicStorage.methods.delBytesData(key, innerkey).send({from: accounts[0]});;
      data = await testBasicStorage.methods.getBytesData(key, innerkey).call();
      lib.assertNotExists(data);
    } catch (err) {
      lib.assertFail(err);
    }
  });

  it ('set/get/delete string data, it should success', async() => {
    let stringData = accounts[0];
    try {
      let key = await web3.utils.hexToBytes(await web3.utils.toHex("testData"));
      let innerkey = await web3.utils.hexToBytes(await web3.utils.toHex("stringData"));

      await testBasicStorage.methods.setStringData(key, innerkey, stringData).send({from: accounts[0]});;
      let data = await testBasicStorage.methods.getStringData(key, innerkey).call();
      lib.assertCommonEqual(stringData, data);
      await testBasicStorage.methods.delStringData(key, innerkey).send({from: accounts[0]});;
      data = await testBasicStorage.methods.getStringData(key, innerkey).call();
      lib.assertNotDeepEqual(stringData, data);
    } catch (err) {
      lib.assertFail(err);
    }
  });

});
