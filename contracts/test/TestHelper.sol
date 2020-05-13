pragma solidity 0.4.26;

import "../lib/ReentrancyGuard.sol";
import "../lib/BasicStorage.sol";


/// @dev TestHelper is used for coverage test case
contract TestHelper is BasicStorage, ReentrancyGuard {
    uint256 public testBalance = 100000;

    mapping(address => uint256) public delegateAmountMap;

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
        return 6666;
    }

    function getRandomNumberByEpochId(uint256) public view returns(uint256) {
        return 6666;
    }

    function delegateOut(address addr) public returns(bool) {
        msg.sender.transfer(delegateAmountMap[addr]);
        delegateAmountMap[addr] = 0;
        return true;
    }

    function delegateIn(address addr) public payable returns(bool) {
        delegateAmountMap[addr] += msg.value;
        return true;
    }
}
