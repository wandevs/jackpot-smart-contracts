pragma solidity 0.4.26;


contract Types {
    struct UserInfo {
        uint256 prize;
        uint256 codeCount;
        mapping(uint256 => uint256) codesMap;
        mapping(uint256 => uint256) codesIndexMap;
        mapping(uint256 => uint256) codesAmountMap;
    }

    struct PendingRedeem {
        address user;
        uint256 code;
    }

    struct CodeInfo {
        uint256 addrCount;
        mapping(uint256 => address) codeAddressMap;
        mapping(address => uint256) addressIndexMap;
    }

    struct ValidatorsInfo {
        address currentValidator;
        address withdrawFromValidator;
        uint256 validatorsCount;
    }

    struct PoolInfo {
        uint256 prizePool;
        uint256 delegatePercent;
        uint256 delegatePool;
        uint256 demandDepositPool;
    }

    struct SubsidyInfo {
        uint256 total;
        uint256 startIndex;
        uint256 refundingCount;
        mapping(uint256 => address) refundingAddressMap;
        mapping(address => uint256) refundingSubsidyAmountMap;
    }

    event Buy(
        address indexed user,
        uint256 stakeAmount,
        uint256[] codes,
        uint256[] amounts
    );

    event Redeem(
        address indexed user,
        bool indexed success,
        uint256[] codes
    );

    event GasNotEnough();

    event PrizeWithdraw(
        address indexed user,
        bool indexed success
    );

    event UpdateSuccess();

    event SubsidyRefund(address indexed refundAddress, uint256 amount);

    event RandomGenerate(uint256 indexed epochID, uint256 random);

    event LotteryResult(
        uint256 indexed epochID,
        uint256 winnerCode,
        uint256 prizePool,
        address[] winners,
        uint256[] amounts
    );

    event FeeSend(address indexed owner, uint256 indexed amount);

    event DelegateOut(address indexed validator, uint256 amount);

    event DelegateIn(address indexed validator, uint256 amount);
}
