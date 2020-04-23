pragma solidity 0.4.26;

import "./lib/SafeMath.sol";
import "./lib/LibOwnable.sol";
import "./lib/PosHelper.sol";
import "./lib/Types.sol";


contract JacksPot is LibOwnable, PosHelper, Types {
    using SafeMath for uint256;

    uint256 public constant DIVISOR = 1000;

    mapping(address => StakerInfo) public stakerInfoMap;

    uint256 public pendingStakeOutStartIndex;

    uint256 public pendingStakeOutCount;

    mapping(uint256 => PendingStakeOut) public pendingStakeOutMap;

    mapping(uint256 => CodeInfo) public codesMap;

    ValidatorInfo public validatorInfo;

    uint256 public delegateOutAmount;

    PoolInfo public poolInfo;

    SubsidyInfo public subsidyInfo;

    uint256 public feeRate;

    address public operator;

    bool public closed;

    uint256 public maxDigital;

    uint256 public currentRandom;

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
        feeRate = 0;
    }

    function() public payable {}

    function stakeIn(uint256[] codes, uint256[] amounts)
        external
        payable
        notClosed
    {
        checkStakeInValue(codes, amounts);

        for (uint256 i = 0; i < codes.length; i++) {
            //Save stake info
            if (stakerInfoMap[msg.sender].codesAmountMap[codes[i]] > 0) {
                stakerInfoMap[msg.sender]
                    .codesAmountMap[codes[i]] = stakerInfoMap[msg.sender]
                    .codesAmountMap[codes[i]]
                    .add(amounts[i]);
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

        poolInfo.demandDepositPool = poolInfo.demandDepositPool.add(msg.value);

        emit StakeIn(msg.sender, msg.value, codes, amounts);
        emit PoolUpdate(
            poolInfo.delegatePool,
            poolInfo.demandDepositPool,
            poolInfo.prizePool,
            poolInfo.delegatePercent
        );
    }

    function stakeOut(uint256[] codes) external notClosed {
        checkStakeOutValue(codes);

        if (stakeOutAddress(codes, msg.sender)) {
            emit PoolUpdate(
                poolInfo.delegatePool,
                poolInfo.demandDepositPool,
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

    function update() external operatorOnly {
        require(
            poolInfo.demandDepositPool <= address(this).balance,
            "SC_BALANCE_ERROR"
        );

        uint256 changeCnt = 0;

        if (updateBalance()) {
            changeCnt++;
        }

        if (subsidyRefund()) {
            changeCnt++;
        }

        if (stakeOutPendingRefund()) {
            changeCnt++;
        }

        if (changeCnt > 0) {
            emit PoolUpdate(
                poolInfo.delegatePool,
                poolInfo.demandDepositPool,
                poolInfo.prizePool,
                poolInfo.delegatePercent
            );
        }
    }

    function runDelegateIn() external operatorOnly {
        require(
            validatorInfo.defaultValidator != address(0),
            "NO_DEFAULT_VALIDATOR"
        );
        uint256 total = poolInfo
            .delegatePool
            .add(poolInfo.demandDepositPool)
            .sub(subsidyInfo.total);
        uint256 demandDepositAmount = total
            .mul(DIVISOR - poolInfo.delegatePercent)
            .div(DIVISOR);
        if (demandDepositAmount > poolInfo.demandDepositPool) {
            uint256 delegateAmount = demandDepositAmount.sub(
                poolInfo.demandDepositPool
            );
            require(
                delegateIn(validatorInfo.defaultValidator, delegateAmount),
                "DELEGATE_IN_FAILED"
            );
            poolInfo.delegatePool = poolInfo.delegatePool.add(delegateAmount);
            poolInfo.demandDepositPool = poolInfo.demandDepositPool.sub(
                delegateAmount
            );
            emit DelegateIn(validatorInfo.defaultValidator, delegateAmount);
        }
    }

    function open() external operatorOnly {
        closed = false;
    }

    function close() external operatorOnly {
        closed = true;
    }

    function lotterySettlement() external operatorOnly {
        uint256 epochId = getEpochId(now);

        currentRandom = getRandomByEpochId(epochId);

        uint256 winnerCode = currentRandom.mod(maxDigital);

        uint256 feeAmount = poolInfo.prizePool.mul(feeRate).div(DIVISOR);

        uint256 prizePool = poolInfo.prizePool.sub(feeAmount);

        address[] memory winners;

        uint256[] memory amounts;

        if (codesMap[winnerCode].addrCount > 0) {
            winners = new address[](codesMap[winnerCode].addrCount);
            amounts = new uint256[](codesMap[winnerCode].addrCount);

            uint256 winnerStakeAmountTotal = 0;
            for (uint256 i = 0; i < codesMap[winnerCode].addrCount; i++) {
                winners[i] = codesMap[winnerCode].codeAddressMap[i];
                winnerStakeAmountTotal = winnerStakeAmountTotal.add(
                    stakerInfoMap[winners[i]].codesAmountMap[winnerCode]
                );
            }

            for (uint256 j = 0; j < codesMap[winnerCode].addrCount; j++) {
                amounts[j] = prizePool
                    .mul(stakerInfoMap[winners[j]].codesAmountMap[winnerCode])
                    .div(winnerStakeAmountTotal);
                stakerInfoMap[winners[j]].prize = stakerInfoMap[winners[j]]
                    .prize
                    .add(amounts[j]);
            }

            poolInfo.demandDepositPool = poolInfo.demandDepositPool.add(
                prizePool
            );

            poolInfo.prizePool = 0;

            if (feeAmount > 0) {
                owner().transfer(feeAmount);
                emit FeeSend(owner(), feeAmount);
            }

            emit PoolUpdate(
                poolInfo.delegatePool,
                poolInfo.demandDepositPool,
                poolInfo.prizePool,
                poolInfo.delegatePercent
            );
        } else {
            winners = new address[](1);
            winners[0] = address(0);
            amounts = new uint256[](1);
            amounts[0] = 0;
        }

        emit RandomGenerate(epochId, currentRandom);
        emit LotteryResult(epochId, winnerCode, prizePool, winners, amounts);
    }

    function setOperator(address op) external onlyOwner {
        require(op != address(0), "INVALID_ADDRESS");
        operator = op;
    }

    function setValidator(address validator) external onlyOwner {
        require(validator != address(0), "INVALID_ADDRESS");
        validatorInfo.defaultValidator = validator;
    }

    function runDelegateOut(address validator) external onlyOwner {
        require(validator != address(0), "INVALID_ADDRESS");
        require(
            validatorInfo.validatorAmountMap[validator] > 0,
            "NO_SUCH_VALIDATOR"
        );
        require(
            validatorInfo.exitingValidator == address(0),
            "THERE_IS_EXITING_VALIDATOR"
        );
        require(delegateOutAmount == 0, "DELEGATE_OUT_AMOUNT_NOT_ZERO");
        validatorInfo.exitingValidator = validator;
        delegateOutAmount = validatorInfo.validatorAmountMap[validator];
        require(delegateOut(validator), "DELEGATE_OUT_FAILED");

        emit DelegateOut(validator, delegateOutAmount);
    }

    function setFeeRate(uint256 fee) external onlyOwner {
        require(fee < 1000, "FEE_RATE_TOO_LAREGE");
        feeRate = fee;
    }

    function setDelegatePercent(uint256 percent) external onlyOwner {
        require(percent <= 1000, "DELEGATE_PERCENT_TOO_LAREGE");

        poolInfo.delegatePercent = percent;
    }

    function setMaxDigital(uint256 max) external onlyOwner {
        require(max > 0, "MUST_GREATER_THAN_ZERO");
        maxDigital = max;
    }

    function subsidyIn() external payable {
        require(msg.value >= 10 ether, "SUBSIDY_TOO_SMALL");
        require(tx.origin == msg.sender, "NOT_ALLOW_SMART_CONTRACT");
        subsidyInfo.subsidyAmountMap[msg.sender] = msg.value;
        subsidyInfo.total = subsidyInfo.total.add(msg.value);
        poolInfo.demandDepositPool = poolInfo.demandDepositPool.add(msg.value);
    }

    function subsidyOut() external {
        require(
            subsidyInfo.subsidyAmountMap[msg.sender] > 0,
            "SUBSIDY_AMOUNT_ZERO"
        );

        for (
            uint256 i = subsidyInfo.startIndex;
            i < subsidyInfo.startIndex + subsidyInfo.refundingCount;
            i++
        ) {
            require(
                subsidyInfo.refundingAddressMap[i] != msg.sender,
                "ALREADY_SUBMIT_SUBSIDY_OUT"
            );
        }

        subsidyInfo.refundingAddressMap[subsidyInfo.startIndex +
            subsidyInfo.refundingCount] = msg.sender;
        subsidyInfo.refundingCount++;
    }

    function checkStakeInValue(uint256[] memory codes, uint256[] memory amounts)
        private
        view
    {
        uint256 maxCount = 50;
        uint256 minAmount = 10 ether;

        require(tx.origin == msg.sender, "NOT_ALLOW_SMART_CONTRACT");
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
            totalAmount = totalAmount.add(amounts[i]);
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
    function removeStakerCodesMap(uint256 valueToRemove, address staker)
        private
    {
        if (stakerInfoMap[staker].codeCount <= 1) {
            stakerInfoMap[staker].codeCount = 0;
            stakerInfoMap[staker].codesMap[0] = 0;
            return;
        }

        for (uint256 i = 0; i < stakerInfoMap[staker].codeCount; i++) {
            if (stakerInfoMap[staker].codesMap[i] == valueToRemove) {
                stakerInfoMap[staker].codesMap[i] = stakerInfoMap[staker]
                    .codesMap[stakerInfoMap[staker].codeCount - 1];
                stakerInfoMap[staker].codesMap[stakerInfoMap[staker].codeCount -
                    1] = 0;
                stakerInfoMap[staker].codeCount--;
                return;
            }
        }
    }

    function removeCodeInfoMap(uint256 code, address staker) private {
        if (codesMap[code].addrCount <= 1) {
            codesMap[code].addrCount = 0;
            codesMap[code].codeAddressMap[0] = address(0);
        }

        for (uint256 i = 0; i < codesMap[code].addrCount; i++) {
            if (codesMap[code].codeAddressMap[i] == staker) {
                codesMap[code].codeAddressMap[i] = codesMap[code]
                    .codeAddressMap[codesMap[code].addrCount - 1];
                codesMap[code].codeAddressMap[codesMap[code].addrCount -
                    1] = address(0);
                codesMap[code].addrCount--;
                return;
            }
        }
    }

    function removeValidatorMap() private {
        if (validatorInfo.validatorCount <= 1) {
            validatorInfo.validatorCount = 0;
            validatorInfo.validatorMap[0] = address(0);
        }

        for (uint256 i = 0; i < validatorInfo.validatorCount; i++) {
            if (
                validatorInfo.validatorMap[i] == validatorInfo.exitingValidator
            ) {
                validatorInfo.validatorMap[i] = validatorInfo
                    .validatorMap[validatorInfo.validatorCount - 1];
                validatorInfo.validatorMap[validatorInfo.validatorCount -
                    1] = address(0);
                validatorInfo.validatorCount--;
                return;
            }
        }
    }

    function updateBalance() private returns (bool) {
        if (
            address(this).balance >
            poolInfo.demandDepositPool.add(poolInfo.prizePool)
        ) {
            uint256 extra = address(this).balance.sub(
                poolInfo.demandDepositPool.add(poolInfo.prizePool)
            );
            if ((delegateOutAmount > 0) && (delegateOutAmount <= extra)) {
                poolInfo.prizePool = poolInfo.prizePool.add(
                    extra.sub(delegateOutAmount)
                );
                poolInfo.demandDepositPool = poolInfo.demandDepositPool.add(
                    delegateOutAmount
                );
                poolInfo.delegatePool = poolInfo.delegatePool.sub(
                    delegateOutAmount
                );
                validatorInfo.validatorAmountMap[validatorInfo
                    .exitingValidator] = 0;
                delegateOutAmount = 0;
                removeValidatorMap();
                validatorInfo.exitingValidator = address(0);
            } else {
                poolInfo.prizePool = address(this).balance.sub(
                    poolInfo.demandDepositPool
                );
            }
            return true;
        }
        return false;
    }

    function subsidyRefund() private returns (bool change) {
        change = false;
        for (; subsidyInfo.refundingCount > 0; ) {
            uint256 i = subsidyInfo.startIndex;
            address refundingAddress = subsidyInfo.refundingAddressMap[i];
            require(
                refundingAddress != address(0),
                "SUBSIDY_REFUND_ADDRESS_ERROR"
            );
            uint256 singleAmount = subsidyInfo
                .subsidyAmountMap[refundingAddress];
            if (poolInfo.demandDepositPool >= singleAmount) {
                subsidyInfo.subsidyAmountMap[refundingAddress] = 0;
                subsidyInfo.refundingAddressMap[i] = address(0);
                subsidyInfo.refundingCount--;
                subsidyInfo.startIndex++;
                subsidyInfo.total = subsidyInfo.total.sub(singleAmount);
                refundingAddress.transfer(singleAmount);
                poolInfo.demandDepositPool = poolInfo.demandDepositPool.sub(
                    singleAmount
                );
                emit SubsidyRefund(refundingAddress, singleAmount);
                change = true;
            } else {
                break;
            }
        }
    }

    function stakeOutPendingRefund() private returns (bool change) {
        change = false;
        for (; subsidyInfo.refundingCount == 0 && pendingStakeOutCount > 0; ) {
            uint256 i = pendingStakeOutStartIndex;
            require(
                pendingStakeOutMap[i].staker != address(0),
                "STAKE_OUT_ADDRESS_ERROR"
            );
            uint256[] memory codes = new uint256[](1);
            codes[0] = pendingStakeOutMap[i].code;
            if (stakeOutAddress(codes, pendingStakeOutMap[i].staker)) {
                pendingStakeOutStartIndex++;
                pendingStakeOutCount--;
                change = true;
            } else {
                break;
            }
        }
    }

    function stakeOutAddress(uint256[] memory codes, address staker)
        private
        returns (bool)
    {
        uint256 totalAmount = stakerInfoMap[staker].prize;

        for (uint256 i = 0; i < codes.length; i++) {
            totalAmount = totalAmount.add(
                stakerInfoMap[staker].codesAmountMap[codes[i]]
            );
        }

        totalAmount = totalAmount.add(stakerInfoMap[staker].prize);

        if (totalAmount <= poolInfo.demandDepositPool) {
            require(
                poolInfo.demandDepositPool <= address(this).balance,
                "SC_BALANCE_ERROR"
            );

            poolInfo.demandDepositPool = poolInfo.demandDepositPool.sub(
                totalAmount
            );

            for (uint256 m = 0; m < codes.length; m++) {
                stakerInfoMap[staker].codesAmountMap[codes[m]] = 0;
                removeStakerCodesMap(codes[m], staker);
                removeCodeInfoMap(codes[m], staker);
            }

            stakerInfoMap[staker].prize = 0;

            staker.transfer(totalAmount);

            emit StakeOut(staker, codes, false);
            return true;
        }
        return false;
    }
}
