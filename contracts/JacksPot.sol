pragma solidity 0.4.26;

import "./lib/SafeMath.sol";
import "./lib/LibOwnable.sol";
import "./lib/PosHelper.sol";


contract JacksPot is LibOwnable, PosHelper {
    using SafeMath for uint256;

    uint256 public constant DIVISOR = 1000;

    struct StakerInfo {
        uint256 prize;
        uint256 codeCount;
        mapping(uint256 => uint256) codesMap;
        mapping(uint256 => uint256) codesAmountMap;
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
        address defaultValidator;
        uint256 validatorCount;
        mapping(uint256 => address) validatorMap;
        mapping(address => uint256) validatorAmountMap;
    }

    ValidatorInfo public validatorInfo;

    uint256 public delegateOutAmount;

    struct PoolInfo {
        uint256 prizePool;
        uint256 delegatePercent;
        uint256 delegatePool;
        uint256 demandDepositPool;
        uint256 baseDemandPool;
        uint256 subsidyPool;
        mapping(address => uint256) subsidyOwner;
    }

    PoolInfo public poolInfo;

    uint256 public feeRate;

    address public operator;

    bool public closed;

    uint256 public maxDigital;

    event StakeIn(
        address indexed staker,
        uint256 stakeAmount,
        uint256[] codes,
        uint256[] amounts
    );

    event StakeOut(address indexed staker, uint256[] codes, bool pending);

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

    modifier operatorOnly() {
        require(msg.sender == operator, "NOT_OPERATOR");
        _;
    }

    constructor() public {
        poolInfo.delegatePercent = 700; // 70%
        maxDigital = 10000; // 0000~9999
        closed = false;
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

    function stakeOut(uint256[] memory codes) public notClosed {
        checkStakeOutValue(codes);

        uint256 totalAmount = stakerInfoMap[msg.sender].prize;

        for (uint256 i = 0; i < codes.length; i++) {
            totalAmount += stakerInfoMap[msg.sender].codesAmountMap[codes[i]];
        }

        totalAmount += stakerInfoMap[msg.sender].prize;

        if (totalAmount <= poolInfo.demandDepositPool) {
            require(
                poolInfo.demandDepositPool <= address(this).balance,
                "SC_BALANCE_ERROR"
            );
            require(totalAmount <= address(this).balance, "SC_BALANCE_ERROR_2");

            poolInfo.demandDepositPool -= totalAmount;

            if (poolInfo.baseDemandPool >= totalAmount) {
                poolInfo.baseDemandPool -= totalAmount;
            } else {
                poolInfo.subsidyPool -= (totalAmount - poolInfo.baseDemandPool);
                poolInfo.baseDemandPool = 0;
            }

            require(
                poolInfo.demandDepositPool ==
                    (poolInfo.baseDemandPool + poolInfo.subsidyPool),
                "POOL_VALUE_NOT_MATCH"
            );

            for (uint256 m = 0; m < codes.length; m++) {
                stakerInfoMap[msg.sender].codesAmountMap[codes[m]] = 0;
                removeStakerCodesMap(codes[m]);
                removeCodeInfoMap(codes[m]);
            }

            stakerInfoMap[msg.sender].prize = 0;

            msg.sender.transfer(totalAmount);

            emit StakeOut(msg.sender, codes, false);
            emit PoolUpdate(
                poolInfo.delegatePool,
                poolInfo.demandDepositPool,
                poolInfo.baseDemandPool,
                poolInfo.subsidyPool,
                poolInfo.prizePool,
                poolInfo.delegatePercent
            );
        } else {
            for (uint256 n = 0; n < codes.length; n++) {
                pendingStakeOutMap[pendingStakeOutCount].staker = msg.sender;
                pendingStakeOutMap[pendingStakeOutCount].code = codes[n];
                pendingStakeOutCount++;
            }

            emit StakeOut(msg.sender, codes, true);
        }
    }

    function update() public operatorOnly {
        require(
            poolInfo.demandDepositPool <= address(this).balance,
            "SC_BALANCE_ERROR"
        );

        // check balance
        if (
            address(this).balance >
            (poolInfo.demandDepositPool + poolInfo.prizePool)
        ) {
            uint256 extra = address(this).balance -
                (poolInfo.demandDepositPool + poolInfo.prizePool);
            if ((delegateOutAmount > 0) && (delegateOutAmount <= extra)) {
                poolInfo.prizePool += extra - delegateOutAmount;
                poolInfo.baseDemandPool += delegateOutAmount;
                delegateOutAmount = 0;
            } else {
                poolInfo.prizePool =
                    address(this).balance -
                    poolInfo.demandDepositPool;
            }
        }

        //TODO: refund subsidy

        //TODO: refund pendingDemandRefund.
    }

    function() public payable {
        require(false, "DO_NOT_ACCEPT_NORMAL_TRANSFER");
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
            require(codes[i] < maxDigital, "OUT_OF_MAX_DIGITAL");
            totalAmount += amounts[i];
        }

        require(totalAmount == msg.value, "VALUE_NOT_EQUAL_AMOUNT");
    }

    function checkStakeOutValue(uint256[] memory codes) private view {
        uint256 maxCount = 100;

        require(codes.length > 0, "INVALID_CODES_LENGTH");
        require(codes.length <= maxCount, "CODES_LENGTH_TOO_LONG");

        //check codes
        for (uint256 i = 0; i < codes.length; i++) {
            require(codes[i] < maxDigital, "OUT_OF_MAX_DIGITAL");
            for (uint256 m = 0; m < codes.length; m++) {
                if (i != m) {
                    require(codes[i] != codes[m], "CODES_MUST_NOT_SAME");
                }
            }
        }

        for (uint256 j = 0; j < pendingStakeOutCount; j++) {
            for (uint256 n = 0; n < codes.length; n++) {
                if (
                    (pendingStakeOutMap[j].staker == msg.sender) &&
                    (pendingStakeOutMap[j].code == codes[n])
                ) {
                    require(false, "STAKER_CODE_IS_EXITING");
                }
            }
        }
    }

    // for stakerInfoMap[msg.sender].codesMap; remove.
    function removeStakerCodesMap(uint256 valueToRemove) private {
        if (stakerInfoMap[msg.sender].codeCount <= 1) {
            stakerInfoMap[msg.sender].codeCount = 0;
            stakerInfoMap[msg.sender].codesMap[0] = 0;
            return;
        }

        for (uint256 i = 0; i < stakerInfoMap[msg.sender].codeCount; i++) {
            if (stakerInfoMap[msg.sender].codesMap[i] == valueToRemove) {
                stakerInfoMap[msg.sender].codesMap[i] = stakerInfoMap[msg
                    .sender]
                    .codesMap[stakerInfoMap[msg.sender].codeCount - 1];
                stakerInfoMap[msg.sender].codesMap[stakerInfoMap[msg.sender]
                    .codeCount - 1] = 0;
                stakerInfoMap[msg.sender].codeCount--;
                return;
            }
        }
    }

    function removeCodeInfoMap(uint256 code) private {
        if (codesMap[code].addrCount <= 1) {
            codesMap[code].addrCount = 0;
            codesMap[code].codeAddressMap[0] = address(0);
        }

        for (uint256 i = 0; i < codesMap[code].addrCount; i++) {
            if (codesMap[code].codeAddressMap[i] == msg.sender) {
                codesMap[code].codeAddressMap[i] = codesMap[code]
                    .codeAddressMap[codesMap[code].addrCount - 1];
                codesMap[code].codeAddressMap[codesMap[code].addrCount -
                    1] = address(0);
                codesMap[code].addrCount--;
                return;
            }
        }
    }
}
