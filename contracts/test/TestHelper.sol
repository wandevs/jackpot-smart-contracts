pragma solidity 0.4.26;

import "../lib/ReentrancyGuard.sol";
import "../lib/BasicStorage.sol";


/// @dev TestHelper is used for coverage test case
contract TestHelper is BasicStorage, ReentrancyGuard {
    uint256 public testBalance = 100000;

    mapping(address => uint256) public delegateAmountMap;

    uint256 public random = 6666;

    function() public payable {
        reentrancyTest();
    }

    function reentrancyTest() public nonReentrant payable {
        testBalance += 1;
        address(this).transfer(msg.value / 2);
    }

    function getEpochId(uint256) public view returns(uint256) {
        return 18324;
    }

    function getRandomNumberByTimestamp(uint256) public view returns(uint256) {
        return random;
    }

    function getRandomNumberByEpochId(uint256) public view returns(uint256) {
        return random;
    }

    function delegateOut(address addr) public returns(bool) {
        require(delegateAmountMap[addr] > 0, "DELEGATE_AMOUNT_ZERO");
        msg.sender.transfer(delegateAmountMap[addr]);
        delegateAmountMap[addr] = 0;
        return true;
    }

    function delegateIn(address addr) public payable returns(bool) {
        delegateAmountMap[addr] = delegateAmountMap[addr] + msg.value;
        require(delegateAmountMap[addr] < 1000000 ether, "OUT_OF_DELEGATE_AMOUNT_RANGE");
        return true;
    }

    function setRandom(uint256 rd) external {
        random = rd;
    }
}
