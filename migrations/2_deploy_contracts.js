var JacksPot =  artifacts.require("./JacksPot.sol");

module.exports = function(deployer,network, accounts) {
    deployer.deploy(JacksPot);
};

