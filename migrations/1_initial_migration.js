const Migrations = artifacts.require("Migrations");
const PHAToken = artifacts.require("PHAToken");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(PHAToken, 1_000_000_000);
};
