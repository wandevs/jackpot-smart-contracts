module.exports = {
    skipFiles: [
        'lib/SafeMath.sol',
        'lib/PosHelper.sol',
        'lib/Migrations.sol'],
    providerOptions: {
        default_balance_ether: 1000000,
        hardfork: "byzantium"
    }
};
