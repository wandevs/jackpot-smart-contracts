pragma solidity 0.4.26;


contract Types {
    struct StakerInfo {
        uint256 prize;
        uint256 codeCount;
        mapping(uint256 => uint256) codesMap;
        mapping(uint256 => uint256) codesAmountMap;
    }

    struct PendingStakeOut {
        address staker;
        uint256 code;
    }

    struct CodeInfo {
        uint256 addrCount;
        mapping(uint256 => address) codeAddressMap;
    }

    struct ValidatorInfo {
        address defaultValidator;
        address exitingValidator;
        uint256 validatorCount;
        mapping(uint256 => address) validatorMap;
        mapping(address => uint256) validatorAmountMap;
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
        mapping(address => uint256) subsidyAmountMap;
    }

    event StakeIn(
        address indexed staker,
        uint256 stakeAmount,
        uint256[] codes,
        uint256[] amounts
    );

    event StakeOut(
        address indexed staker,
        uint256[] codes,
        bool indexed pending
    );

    event PoolUpdate(
        uint256 indexed timestamp,
        uint256 delegatePool,
        uint256 demandDepositPool,
        uint256 prizePool,
        uint256 delegatePercent
    );

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
