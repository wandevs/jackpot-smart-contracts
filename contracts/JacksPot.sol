pragma solidity 0.4.26;

import "./lib/SafeMath.sol";
import "./lib/LibOwnable.sol";


contract JacksPot is LibOwnable {
    using SafeMath for uint256;

    uint256 public constant DIVISOR = 1000;

    struct StakerInfo {
        uint256 codeCount;
        mapping(uint256 => uint256) codesMap;
        mapping(uint256 => uint256) codesAmountMap;
        uint256 price;
    }

    mapping(address => StakerInfo) public stakerInfoMap;

    struct PendingStakeOut {
        address staker;
        uint256 code;
    }

    uint256 public pendingStakeOutCount;

    mapping(uint256 => PendingStakeOut) public pendingStakeOutMap;

    struct CodeInfo {
        uint256 addrCount;
        mapping(uint256 => address) codeAddressMap;
    }

    mapping(uint256 => CodeInfo) public codesMap;

    struct ValidatorInfo {
        uint256 validatorCount;
        mapping(uint256 => address) validatorMap;
        address defaultValidator;
        mapping(address => uint256) validatorAmountMap;
    }

    ValidatorInfo public validatorInfo;

    uint256 public delegateOutAmount;

    struct PoolInfo {
        uint256 delegatePool;
        uint256 demandDepositPool;
        uint256 baseDemandPool;
        uint256 subsidyPool;
        mapping(address => uint256) subsidyOwner;
        uint256 pricePool;
        uint256 delegatePercent;
    }

    PoolInfo public poolInfo;

    uint256 public feeRate;

    address public operator;

    
}
