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
        uint256 prize;
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
        uint256 prizePool;
        uint256 delegatePercent;
    }

    PoolInfo public poolInfo;

    uint256 public feeRate;

    address public operator;

    bool public closed;

    event StakeIn(
        address indexed staker,
        uint256 stakeAmount,
        uint256[] codes,
        uint256[] amounts
    );

    event PoolUpdate(
        uint256 delegatePool,
        uint256 demandDepositPool,
        uint256 baseDemandPool,
        uint256 subsidyPool,
        uint256 prizePool,
        uint256 delegatePercent
    );

    modifier notClosed() {
        require(!closed, "GAME_ROUND_CLOSE");
        _;
    }

    constructor() public {
        poolInfo.delegatePercent = 700; // 70%
    }

    function stakeIn(uint256[] memory codes, uint256[] memory amounts)
        public
        payable
        notClosed
    {
        checkStakeInValue(codes, amounts);

        for (uint256 i = 0; i < codes.length; i++) {
            //Save stake info
            if (stakerInfoMap[msg.sender].codesAmountMap[codes[i]] > 0) {
                stakerInfoMap[msg.sender]
                    .codesAmountMap[codes[i]] += amounts[i];
            } else {
                stakerInfoMap[msg.sender].codesAmountMap[codes[i]] = amounts[i];
                stakerInfoMap[msg.sender].codesMap[stakerInfoMap[msg.sender]
                    .codeCount] = codes[i];
                stakerInfoMap[msg.sender].codeCount++;
            }

            //Save code info
            bool found = false;
            if (codesMap[codes[i]].addrCount > 0) {
                for (uint256 m = 0; m < codesMap[codes[i]].addrCount; m++) {
                    if (codesMap[codes[i]].codeAddressMap[m] == msg.sender) {
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                codesMap[codes[i]].codeAddressMap[codesMap[codes[i]]
                    .addrCount] = msg.sender;
                codesMap[codes[i]].addrCount++;
            }
        }

        poolInfo.demandDepositPool += msg.value;
        poolInfo.baseDemandPool += msg.value;

        emit StakeIn(msg.sender, msg.value, codes, amounts);
        emit PoolUpdate(
            poolInfo.delegatePool,
            poolInfo.demandDepositPool,
            poolInfo.baseDemandPool,
            poolInfo.subsidyPool,
            poolInfo.prizePool,
            poolInfo.delegatePercent
        );
    }

    function checkStakeInValue(uint256[] memory codes, uint256[] memory amounts)
        private
        view
    {
        uint256 maxCount = 50;
        uint256 minAmount = 10 ether;

        require(codes.length > 0, "INVALID_CODES_LENGTH");
        require(amounts.length > 0, "INVALID_AMOUNTS_LENGTH");
        require(amounts.length <= maxCount, "AMOUNTS_LENGTH_TOO_LONG");
        require(codes.length <= maxCount, "CODES_LENGTH_TOO_LONG");
        require(
            codes.length == amounts.length,
            "CODES_AND_AMOUNTS_LENGTH_NOT_EUQAL"
        );

        uint256 totalAmount = 0;
        //check codes and amounts
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] >= minAmount, "AMOUNT_TOO_SMALL");
            require(amounts[i] % minAmount == 0, "AMOUNT_MUST_TIMES_10");

            for (uint256 m = 0; m < codes.length; m++) {
                if (i != m) {
                    require(codes[i] != codes[m], "CODE_MUST_NOT_SAME");
                }
            }
            totalAmount += amounts[i];
        }

        require(totalAmount == msg.value, "VALUE_NOT_EQUAL_AMOUNT");
    }
}
