pragma solidity 0.4.26;

import "./lib/SafeMath.sol";
import "./lib/LibOwnable.sol";
import "./lib/PosHelper.sol";
import "./lib/Types.sol";
import "./lib/ReentrancyGuard.sol";


/// @title Jack's Pot Smart Contract
/// @dev Jack’s Pot is a no-loss lottery game built on Wanchain
contract JacksPot is LibOwnable, PosHelper, Types, ReentrancyGuard {
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

    /// --------------Public Method--------------------------

    constructor() public {
        poolInfo.delegatePercent = 700; // 70%
        maxDigital = 10000; // 0000~9999
        closed = false;
        feeRate = 0;
    }

    /// @dev The operating contract accepts general transfer, and the transferred funds directly enter the prize pool.
    function() public payable nonReentrant {}

    /// @dev User betting function.
    /// @param codes An array that can contain Numbers selected by the user.
    /// @param amounts An array that can contain the user's bet amount on each number, with a minimum of 10 wan.
    function stakeIn(uint256[] codes, uint256[] amounts)
        external
        payable
        notClosed
        nonReentrant
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

    /// @dev This is the user refund function, where users can apply to withdraw funds invested on certain Numbers and receive bonuses.
    /// @param codes The array contains the number the user wants a refund from.
    function stakeOut(uint256[] codes) external notClosed nonReentrant {
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

    /// @dev The settlement robot calls this function daily to update the capital pool and settle the pending refund.
    function update() external operatorOnly nonReentrant {
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

    /// @dev After the settlement is completed, the settlement robot will call this function to conduct POS delegation to the funds in the capital pool that meet the proportion of the commission.
    function runDelegateIn() external operatorOnly nonReentrant {
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
        if (
            demandDepositAmount <
            poolInfo.demandDepositPool.sub(subsidyInfo.total)
        ) {
            uint256 delegateAmount = poolInfo
                .demandDepositPool
                .sub(subsidyInfo.total)
                .sub(demandDepositAmount);
            require(
                delegateIn(validatorInfo.defaultValidator, delegateAmount),
                "DELEGATE_IN_FAILED"
            );
            validatorInfo.validatorAmountMap[validatorInfo
                .defaultValidator] = validatorInfo
                .validatorAmountMap[validatorInfo.defaultValidator]
                .add(delegateAmount);
            poolInfo.delegatePool = poolInfo.delegatePool.add(delegateAmount);
            poolInfo.demandDepositPool = poolInfo.demandDepositPool.sub(
                delegateAmount
            );
            emit DelegateIn(validatorInfo.defaultValidator, delegateAmount);
        }
    }

    /// @dev This function is called regularly by the robot every 6 morning to open betting.
    function open() external operatorOnly nonReentrant {
        closed = false;
    }

    /// @dev This function is called regularly by the robot on 4 nights a week to close bets.
    function close() external operatorOnly nonReentrant {
        closed = true;
    }

    /// @dev Lottery settlement function. On the Friday night, the robot calls this function to get random Numbers and complete the lucky draw process.
    function lotterySettlement() external operatorOnly nonReentrant {
        uint256 epochId = getEpochId(now);

        // should use the random number latest
        currentRandom = getRandomByEpochId(epochId + 1);

        require(currentRandom != 0, "RANDOM_NUMBER_NOT_READY");

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

    /// @dev The owner calls this function to set the operator address.
    /// @param op This is operator address.
    function setOperator(address op) external onlyOwner nonReentrant {
        require(op != address(0), "INVALID_ADDRESS");
        operator = op;
    }

    /// @dev The owner calls this function to set the default POS validator node address for delegation.
    /// @param validator The validator address.
    function setValidator(address validator) external onlyOwner nonReentrant {
        require(validator != address(0), "INVALID_ADDRESS");
        validatorInfo.defaultValidator = validator;
    }

    /// @dev The owner calls this function to drive the contract to issue a POS delegate refund to the specified validator address.
    /// @param validator The validator address.
    function runDelegateOut(address validator) external onlyOwner nonReentrant {
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

    /// @dev The owner calls this function to modify The handling fee Shared from The prize pool.
    /// @param fee Any parts per thousand.
    function setFeeRate(uint256 fee) external onlyOwner nonReentrant {
        require(fee < 1000, "FEE_RATE_TOO_LAREGE");
        feeRate = fee;
    }

    /// @dev Owner calls this function to modify the default POS delegate ratio for the pool.
    /// @param percent Any parts per thousand.
    function setDelegatePercent(uint256 percent) external onlyOwner nonReentrant {
        require(percent <= 1000, "DELEGATE_PERCENT_TOO_LAREGE");

        poolInfo.delegatePercent = percent;
    }

    /// @dev Owner calls this function to modify the number of lucky draw digits, and the random number takes the modulus of this number.
    /// @param max New value.
    function setMaxDigital(uint256 max) external onlyOwner nonReentrant {
        require(max > 0, "MUST_GREATER_THAN_ZERO");
        maxDigital = max;
    }

    /// @dev Anyone can call this function to inject a subsidy into the current pool, which is used for the user's refund. It can be returned at any time.
    function subsidyIn() external payable nonReentrant {
        require(msg.value >= 10 ether, "SUBSIDY_TOO_SMALL");
        require(tx.origin == msg.sender, "NOT_ALLOW_SMART_CONTRACT");
        subsidyInfo.subsidyAmountMap[msg.sender] = msg.value;
        subsidyInfo.total = subsidyInfo.total.add(msg.value);
        poolInfo.demandDepositPool = poolInfo.demandDepositPool.add(msg.value);
    }

    /// @dev Apply for subsidy refund function. If the current pool is sufficient for application of subsidy, the refund will be made on the daily settlement.
    function subsidyOut() external nonReentrant {
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

    /// --------------Private Method--------------------------

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
