var JacksPot =  artifacts.require("./JacksPotDelegate.sol");

module.exports = function(deployer,network, accounts) {
    deployer.deploy(JacksPot);
};

