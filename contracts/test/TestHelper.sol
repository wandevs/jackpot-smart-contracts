pragma solidity 0.4.26;

import "../lib/ReentrancyGuard.sol";
import "../lib/BasicStorage.sol";


/// @dev TestHelper is used for coverage test case
contract TestHelper is BasicStorage, ReentrancyGuard {
    uint256 public testBalance = 100000;

    function() public payable {
        reentrancyTest();
    }

    function reentrancyTest() public nonReentrant payable {
        testBalance += 1;
        address(this).transfer(msg.value / 2);
    }
}
