pragma solidity 0.4.26;

import "./lib/SafeMath.sol";
import "./lib/Types.sol";
import "./lib/BasicStorage.sol";
import "./lib/LibOwnable.sol";



/// @title Jack's Pot Smart Contract
/// @dev Jack’s Pot is a no-loss lottery game built on Wanchain
contract JacksPotStorage is LibOwnable, BasicStorage, Types {
    using SafeMath for uint256;

    uint256 public constant DIVISOR = 1000;

    uint256 maxCount = 50;

    uint256 minAmount = 10 ether;

    uint256 minGasLeft = 20000;

    uint256 firstDelegateMinValue = 100 ether;

    mapping(address => StakerInfo) public stakerInfoMap;

    mapping(uint256 => CodeInfo) public codesMap;

    //------Data for pending stake out-----------------------
    uint256 public pendingStakeOutStartIndex;
    uint256 public pendingStakeOutCount;
    mapping(uint256 => PendingStakeOut) public pendingStakeOutMap;
    mapping(address => mapping(uint256 => uint256)) public pendingStakeOutSearchMap;

    //------Data for pending prize out-----------------------
    uint256 public pendingPrizeWithdrawStartIndex;
    uint256 public pendingPrizeWithdrawCount;
    mapping(uint256 => address) public pendingPrizeWithdrawMap;

    //------Data for validator info-----------------------
    ValidatorsInfo public validatorsInfo;
    mapping(uint256 => address) public validatorsMap;
    mapping(address => uint256) public validatorIndexMap;
    mapping(address => uint256) public validatorsAmountMap;

    uint256 public delegateOutAmount;

    PoolInfo public poolInfo;

    SubsidyInfo public subsidyInfo;

    mapping(address => uint256) public subsidyAmountMap;

    uint256 public feeRate;

    address public operator;

    bool public closed;

    uint256 public maxDigital;

    uint256 public currentRandom;
}
