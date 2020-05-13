pragma solidity 0.4.26;

import "./lib/SafeMath.sol";
import "./lib/LibOwnable.sol";
import "./lib/PosHelper.sol";
import "./JacksPotStorage.sol";
import "./lib/ReentrancyGuard.sol";


/// @title Jack's Pot Smart Contract
/// @dev Jack’s Pot is a no-loss lottery game built on Wanchain
contract JacksPotDelegate is JacksPotStorage, ReentrancyGuard, PosHelper {
    modifier notClosed() {
        require(!closed, "GAME_ROUND_CLOSE");
        _;
    }

    modifier operatorOnly() {
        require(msg.sender == operator, "NOT_OPERATOR");
        _;
    }

    /// --------------Public Method--------------------------

    /// @dev The operating contract accepts general transfer, and the transferred funds directly enter the prize pool.
    function() public payable nonReentrant {}

    /// @dev This function will set default value.
    function init() public onlyOwner {
        poolInfo.delegatePercent = 700; // 70%
        maxDigital = 10000; // 0000~9999
        closed = false;
        feeRate = 0;
        posPrecompileAddress = address(0xda);
        randomPrecompileAddress = address(0x262);
    }

    /// @dev User betting function. We do not support smart contract call for security.(DoS with revert)
    /// @param codes An array that can contain Numbers selected by the user.
    /// @param amounts An array that can contain the user's bet amount on each number, with a minimum of 10 wan.
    function buy(uint256[] codes, uint256[] amounts)
        external
        payable
        notClosed
        nonReentrant
    {
        checkBuyValue(codes, amounts);
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < codes.length; i++) {
            require(amounts[i] >= minAmount, "AMOUNT_TOO_SMALL");
            require(amounts[i] % minAmount == 0, "AMOUNT_MUST_TIMES_10");
            require(codes[i] < maxDigital, "OUT_OF_MAX_DIGITAL");
            totalAmount = totalAmount.add(amounts[i]);

            //Save stake info
            if (userInfoMap[msg.sender].codesAmountMap[codes[i]] > 0) {
                userInfoMap[msg.sender]
                    .codesAmountMap[codes[i]] = userInfoMap[msg.sender]
                    .codesAmountMap[codes[i]]
                    .add(amounts[i]);
            } else {
                userInfoMap[msg.sender].codesAmountMap[codes[i]] = amounts[i];
                userInfoMap[msg.sender].codesMap[userInfoMap[msg.sender]
                    .codeCount] = codes[i];

                userInfoMap[msg.sender].codeCount++;
                userInfoMap[msg.sender]
                    .codesIndexMap[codes[i]] = userInfoMap[msg.sender]
                    .codeCount;
            }

            //Save code info
            if (codesMap[codes[i]].addressIndexMap[msg.sender] == 0) {
                codesMap[codes[i]].codeAddressMap[codesMap[codes[i]]
                    .addrCount] = msg.sender;
                codesMap[codes[i]].addrCount++;
                require(
                    codesMap[codes[i]].addrCount <= maxCount * 2,
                    "CODE_BET_REACH_MAX_COUNT"
                );
                codesMap[codes[i]].addressIndexMap[msg
                    .sender] = codesMap[codes[i]].addrCount;
            }
        }

        require(
            userInfoMap[msg.sender].codeCount <= maxCount,
            "OUT_OF_MAX_COUNT"
        );

        require(totalAmount == msg.value, "VALUE_NOT_EQUAL_AMOUNT");

        poolInfo.demandDepositPool = poolInfo.demandDepositPool.add(msg.value);

        emit Buy(msg.sender, msg.value, codes, amounts);
    }

    /// @dev This is the user refund function, where users can apply to withdraw funds invested on certain Numbers.
    /// @param codes The array contains the number the user wants a refund from.
    function redeem(uint256[] codes)
        external
        notClosed
        nonReentrant
        returns (bool)
    {
        checkRedeemValue(codes);

        if (redeemAddress(codes, msg.sender)) {
            emit Redeem(msg.sender, true, codes);
            return true;
        } else {
            for (uint256 n = 0; n < codes.length; n++) {
                pendingRedeemMap[pendingRedeemCount].user = msg.sender;
                pendingRedeemMap[pendingRedeemCount].code = codes[n];
                pendingRedeemCount++;
                pendingRedeemSearchMap[msg.sender][codes[n]] = 1;
            }

            emit Redeem(msg.sender, false, codes);
            return false;
        }
    }

    /// @dev This is the user refund function, where users can apply to withdraw prize.
    function prizeWithdraw() external notClosed nonReentrant returns (bool) {
        require(userInfoMap[msg.sender].prize > 0, "NO_PRIZE_TO_WITHDRAW");
        if (prizeWithdrawAddress(msg.sender)) {
            emit PrizeWithdraw(msg.sender, true);
            return true;
        } else {
            pendingPrizeWithdrawMap[pendingPrizeWithdrawCount] = msg.sender;
            pendingPrizeWithdrawCount++;
            emit PrizeWithdraw(msg.sender, false);
            return false;
        }
    }

    /// @dev The settlement robot calls this function daily to update the capital pool and settle the pending refund.
    function update() external operatorOnly nonReentrant {
        require(
            poolInfo.demandDepositPool <= address(this).balance,
            "SC_BALANCE_ERROR"
        );

        updateBalance();

        if (subsidyRefund()) {
            if (prizeWithdrawPendingRefund()) {
                if (redeemPendingRefund()) {
                    emit UpdateSuccess();
                }
            }
        }
    }

    /// @dev After the settlement is completed, the settlement robot will call this function to conduct POS delegation to the funds in the capital pool that meet the proportion of the commission.
    function runDelegateIn() external operatorOnly nonReentrant returns (bool) {
        require(
            validatorsInfo.currentValidator != address(0),
            "NO_DEFAULT_VALIDATOR"
        );

        if (poolInfo.demandDepositPool <= subsidyInfo.total) {
            return true;
        }

        if (
            poolInfo.delegatePool.add(poolInfo.demandDepositPool) <=
            subsidyInfo.total
        ) {
            return true;
        }

        address currentValidator = validatorsInfo.currentValidator;

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

            if (
                (validatorIndexMap[currentValidator] == 0) &&
                (delegateAmount < firstDelegateMinValue)
            ) {
                emit DelegateIn(validatorsInfo.currentValidator, 0);
                return false;
            }

            require(
                delegateIn(
                    currentValidator,
                    delegateAmount,
                    posPrecompileAddress
                ),
                "DELEGATE_IN_FAILED"
            );

            validatorsAmountMap[currentValidator] = validatorsAmountMap[currentValidator]
                .add(delegateAmount);
            if (validatorIndexMap[currentValidator] == 0) {
                validatorsMap[validatorsInfo
                    .validatorsCount] = currentValidator;
                validatorsInfo.validatorsCount++;
                validatorIndexMap[currentValidator] = validatorsInfo
                    .validatorsCount;
            }

            poolInfo.delegatePool = poolInfo.delegatePool.add(delegateAmount);
            poolInfo.demandDepositPool = poolInfo.demandDepositPool.sub(
                delegateAmount
            );
            emit DelegateIn(validatorsInfo.currentValidator, delegateAmount);
            return true;
        }
        return true;
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
        require(closed, "MUST_CLOSE_BEFORE_SETTLEMENT");

        uint256 epochId = getEpochId(now, randomPrecompileAddress);

        // should use the random number latest
        currentRandom = getRandomByEpochId(
            epochId + 1,
            randomPrecompileAddress
        );

        require(currentRandom != 0, "RANDOM_NUMBER_NOT_READY");

        uint256 winnerCode = uint256(currentRandom.mod(maxDigital));

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
                    userInfoMap[winners[i]].codesAmountMap[winnerCode]
                );
            }

            for (uint256 j = 0; j < codesMap[winnerCode].addrCount; j++) {
                amounts[j] = prizePool
                    .mul(userInfoMap[winners[j]].codesAmountMap[winnerCode])
                    .div(winnerStakeAmountTotal);
                userInfoMap[winners[j]].prize = userInfoMap[winners[j]]
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
    function setValidator(address validator)
        external
        operatorOnly
        nonReentrant
    {
        require(validator != address(0), "INVALID_ADDRESS");
        require(
            validator != validatorsInfo.currentValidator,
            "VALIDATOR_SAME_WITH_CURRENT"
        );
        require(
            validator != validatorsInfo.withdrawFromValidator,
            "VALIDATOR_IS_WITHDRAWING"
        );

        validatorsInfo.currentValidator = validator;
    }

    /// @dev The owner calls this function to drive the contract to issue a POS delegate refund to the specified validator address.
    /// @param validator The validator address.
    function runDelegateOut(address validator)
        external
        operatorOnly
        nonReentrant
    {
        require(validator != address(0), "INVALID_ADDRESS");
        require(validatorsAmountMap[validator] > 0, "NO_SUCH_VALIDATOR");
        require(
            validatorsInfo.withdrawFromValidator == address(0),
            "THERE_IS_EXITING_VALIDATOR"
        );
        require(delegateOutAmount == 0, "DELEGATE_OUT_AMOUNT_NOT_ZERO");
        validatorsInfo.withdrawFromValidator = validator;
        delegateOutAmount = validatorsAmountMap[validator];
        require(
            delegateOut(validator, posPrecompileAddress),
            "DELEGATE_OUT_FAILED"
        );

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
    function setDelegatePercent(uint256 percent)
        external
        onlyOwner
        nonReentrant
    {
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
    /// We do not support smart contract call for security.(DoS with revert)
    function subsidyIn() external payable nonReentrant {
        require(msg.value >= 10 ether, "SUBSIDY_TOO_SMALL");
        require(tx.origin == msg.sender, "NOT_ALLOW_SMART_CONTRACT");
        subsidyAmountMap[msg.sender] = subsidyAmountMap[msg.sender].add(
            msg.value
        );
        subsidyInfo.total = subsidyInfo.total.add(msg.value);
        poolInfo.demandDepositPool = poolInfo.demandDepositPool.add(msg.value);
    }

    /// @dev Apply for subsidy refund function. If the current pool is sufficient for application of subsidy, the refund will be made on the daily settlement.
    function subsidyOut(uint256 amount) external nonReentrant {
        require(
            subsidyAmountMap[msg.sender] >= amount,
            "SUBSIDY_AMOUNT_NOT_ENOUGH"
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

        subsidyInfo.refundingSubsidyAmountMap[msg.sender] = amount;
    }

    /// @dev Get a user's codes and amounts;
    function getUserCodeList(address user)
        external
        view
        returns (uint256[] codes, uint256[] amounts)
    {
        uint256 cnt = userInfoMap[user].codeCount;
        codes = new uint256[](cnt);
        amounts = new uint256[](cnt);
        for (uint256 i = 0; i < cnt; i++) {
            codes[i] = userInfoMap[user].codesMap[i];
            amounts[i] = userInfoMap[user].codesAmountMap[codes[i]];
        }
    }

    /// @dev get all the pending out amount
    function getPendingAmount() external view returns (uint256 total) {
        address user;
        uint256 i;
        total = 0;
        // Total pending subsidy
        for (
            i = subsidyInfo.startIndex;
            i < subsidyInfo.startIndex + subsidyInfo.refundingCount;
            i++
        ) {
            address refundingAddress = subsidyInfo.refundingAddressMap[i];
            total = total.add(
                subsidyInfo.refundingSubsidyAmountMap[refundingAddress]
            );
        }

        // Total pending prize
        for (
            i = pendingPrizeWithdrawStartIndex;
            i < pendingPrizeWithdrawStartIndex + pendingPrizeWithdrawCount;
            i++
        ) {
            user = pendingPrizeWithdrawMap[i];
            total = total.add(userInfoMap[user].prize);
        }

        // Total pending redeem
        for (
            i = pendingRedeemStartIndex;
            i < pendingRedeemStartIndex + pendingRedeemCount;
            i++
        ) {
            user = pendingRedeemMap[i].user;
            uint256 code = pendingRedeemMap[i].code;
            total = total.add(userInfoMap[user].codesAmountMap[code]);
        }
    }

    /// @dev set address for POS delegateIn delegateOut
    function setPosPrecompileAddress(address addr) external onlyOwner {
        require(addr != address(0), "POS_ADDRESS_NOT_ZERO");
        posPrecompileAddress = addr;
    }

    /// @dev set address for random number get
    function setRandomPrecompileAddress(address addr) external onlyOwner {
        require(addr != address(0), "RANDOM_ADDRESS_NOT_ZERO");
        randomPrecompileAddress = addr;
    }

    /// --------------Private Method--------------------------

    function checkBuyValue(uint256[] memory codes, uint256[] memory amounts)
        private
        view
    {
        require(tx.origin == msg.sender, "NOT_ALLOW_SMART_CONTRACT");
        require(codes.length > 0, "INVALID_CODES_LENGTH");
        require(amounts.length > 0, "INVALID_AMOUNTS_LENGTH");
        require(amounts.length <= maxCount, "AMOUNTS_LENGTH_TOO_LONG");
        require(codes.length <= maxCount, "CODES_LENGTH_TOO_LONG");
        require(
            codes.length == amounts.length,
            "CODES_AND_AMOUNTS_LENGTH_NOT_EUQAL"
        );
    }

    function checkRedeemValue(uint256[] memory codes) private view {
        require(codes.length > 0, "INVALID_CODES_LENGTH");
        require(codes.length <= maxCount, "CODES_LENGTH_TOO_LONG");

        uint256 length = codes.length;

        //check codes
        for (uint256 i = 0; i < length; i++) {
            require(codes[i] < maxDigital, "OUT_OF_MAX_DIGITAL");
            for (uint256 m = 0; m < length; m++) {
                if (i != m) {
                    require(codes[i] != codes[m], "CODES_MUST_NOT_SAME");
                }
            }

            if (pendingRedeemSearchMap[msg.sender][codes[i]] > 0) {
                require(false, "STAKER_CODE_IS_EXITING");
            }
        }
    }

    /// @dev Remove user info map.
    function removeUserCodesMap(uint256 valueToRemove, address user) private {
        // If the code has a index
        if (userInfoMap[user].codesIndexMap[valueToRemove] > 0) {
            // If user have only one code, just remove it
            if (userInfoMap[user].codeCount <= 1) {
                userInfoMap[user].codeCount = 0;
                userInfoMap[user].codesMap[0] = 0;
                userInfoMap[user].codesIndexMap[valueToRemove] = 0;
                return;
            }

            // get code index in map
            uint256 i = userInfoMap[user].codesIndexMap[valueToRemove] - 1;

            // remove the index record
            userInfoMap[user].codesIndexMap[valueToRemove] = 0;

            // save last element to index position
            userInfoMap[user].codesMap[i] = userInfoMap[user]
                .codesMap[userInfoMap[user].codeCount - 1];

            // update index of swap element
            userInfoMap[user].codesIndexMap[userInfoMap[user].codesMap[i]] =
                i +
                1;

            // remove last element
            userInfoMap[user].codesMap[userInfoMap[user].codeCount - 1] = 0;

            userInfoMap[user].codeCount--;
        }
    }

    function removeCodeInfoMap(uint256 code, address user) private {
        if (codesMap[code].addressIndexMap[user] > 0) {
            if (codesMap[code].addrCount <= 1) {
                codesMap[code].addrCount = 0;
                codesMap[code].codeAddressMap[0] = address(0);
                codesMap[code].addressIndexMap[user] = 0;
                return;
            }

            uint256 index = codesMap[code].addressIndexMap[user] - 1;
            codesMap[code].addressIndexMap[user] = 0;
            codesMap[code].codeAddressMap[index] = codesMap[code]
                .codeAddressMap[codesMap[code].addrCount - 1];

            codesMap[code].addressIndexMap[codesMap[code]
                .codeAddressMap[index]] = index + 1;

            codesMap[code].codeAddressMap[codesMap[code].addrCount -
                1] = address(0);
            codesMap[code].addrCount--;
        }
    }

    function removeValidatorMap() private {
        if (validatorIndexMap[validatorsInfo.withdrawFromValidator] > 0) {
            if (validatorsInfo.validatorsCount <= 1) {
                validatorsInfo.validatorsCount = 0;
                validatorsMap[0] = address(0);
                validatorIndexMap[validatorsInfo.withdrawFromValidator] = 0;
                return;
            }
            uint256 i = validatorIndexMap[validatorsInfo
                .withdrawFromValidator] - 1;
            validatorIndexMap[validatorsInfo.withdrawFromValidator] = 0;
            validatorsMap[i] = validatorsMap[validatorsInfo.validatorsCount -
                1];

            validatorIndexMap[validatorsMap[i]] = i + 1;

            validatorsMap[validatorsInfo.validatorsCount - 1] = address(0);
            validatorsInfo.validatorsCount--;
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
                validatorsAmountMap[validatorsInfo.withdrawFromValidator] = 0;
                delegateOutAmount = 0;
                removeValidatorMap();
                validatorsInfo.withdrawFromValidator = address(0);
            } else {
                poolInfo.prizePool = address(this).balance.sub(
                    poolInfo.demandDepositPool
                );
            }
            return true;
        }
        return false;
    }

    function subsidyRefund() private returns (bool) {
        for (; subsidyInfo.refundingCount > 0; ) {
            uint256 i = subsidyInfo.startIndex;
            address refundingAddress = subsidyInfo.refundingAddressMap[i];
            require(
                refundingAddress != address(0),
                "SUBSIDY_REFUND_ADDRESS_ERROR"
            );
            uint256 singleAmount = subsidyInfo
                .refundingSubsidyAmountMap[refundingAddress];

            if (gasleft() < minGasLeft) {
                emit GasNotEnough();
                return false;
            }

            if (poolInfo.demandDepositPool >= singleAmount) {
                subsidyAmountMap[refundingAddress] = subsidyAmountMap[refundingAddress]
                    .sub(singleAmount);
                subsidyInfo.refundingAddressMap[i] = address(0);
                subsidyInfo.refundingCount--;
                subsidyInfo.startIndex++;
                subsidyInfo.total = subsidyInfo.total.sub(singleAmount);
                poolInfo.demandDepositPool = poolInfo.demandDepositPool.sub(
                    singleAmount
                );
                subsidyInfo.refundingSubsidyAmountMap[refundingAddress] = 0;
                refundingAddress.transfer(singleAmount);
                emit SubsidyRefund(refundingAddress, singleAmount);
            } else {
                return false;
            }
        }
        return true;
    }

    function redeemPendingRefund() private returns (bool) {
        for (; pendingRedeemCount > 0; ) {
            uint256 i = pendingRedeemStartIndex;
            require(
                pendingRedeemMap[i].user != address(0),
                "STAKE_OUT_ADDRESS_ERROR"
            );
            uint256[] memory codes = new uint256[](1);
            codes[0] = pendingRedeemMap[i].code;

            if (gasleft() < minGasLeft * 5) {
                emit GasNotEnough();
                return false;
            }

            if (redeemAddress(codes, pendingRedeemMap[i].user)) {
                pendingRedeemStartIndex++;
                pendingRedeemCount--;
                pendingRedeemSearchMap[pendingRedeemMap[i]
                    .user][pendingRedeemMap[i].code] = 0;
            } else {
                return false;
            }
        }
        return true;
    }

    function prizeWithdrawPendingRefund() private returns (bool) {
        for (; pendingPrizeWithdrawCount > 0; ) {
            uint256 i = pendingPrizeWithdrawStartIndex;
            require(
                pendingPrizeWithdrawMap[i] != address(0),
                "PRIZE_WITHDRAW_ADDRESS_ERROR"
            );

            if (gasleft() < minGasLeft) {
                emit GasNotEnough();
                return false;
            }

            if (prizeWithdrawAddress(pendingPrizeWithdrawMap[i])) {
                pendingPrizeWithdrawStartIndex++;
                pendingPrizeWithdrawCount--;
            } else {
                return false;
            }
        }
        return true;
    }

    function redeemAddress(uint256[] memory codes, address user)
        private
        returns (bool)
    {
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < codes.length; i++) {
            totalAmount = totalAmount.add(
                userInfoMap[user].codesAmountMap[codes[i]]
            );
        }

        if (totalAmount <= poolInfo.demandDepositPool) {
            require(
                poolInfo.demandDepositPool <= address(this).balance,
                "SC_BALANCE_ERROR"
            );

            user.transfer(totalAmount);

            poolInfo.demandDepositPool = poolInfo.demandDepositPool.sub(
                totalAmount
            );

            for (uint256 m = 0; m < codes.length; m++) {
                userInfoMap[user].codesAmountMap[codes[m]] = 0;
                removeUserCodesMap(codes[m], user);
                removeCodeInfoMap(codes[m], user);
            }

            return true;
        }
        return false;
    }

    function prizeWithdrawAddress(address user) private returns (bool) {
        uint256 totalAmount = userInfoMap[user].prize;
        if (totalAmount <= poolInfo.demandDepositPool) {
            require(
                poolInfo.demandDepositPool <= address(this).balance,
                "SC_BALANCE_ERROR"
            );

            poolInfo.demandDepositPool = poolInfo.demandDepositPool.sub(
                totalAmount
            );

            userInfoMap[user].prize = 0;

            user.transfer(totalAmount);

            return true;
        }
        return false;
    }
}
