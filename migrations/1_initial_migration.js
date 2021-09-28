const Migrations = artifacts.require("Migrations");
const Token = artifacts.require("Token");
const BN = web3.utils.BN;
const UNIT = new BN('1000000000000000000');

module.exports = async function(deployer) {
  await deployer.deploy(Migrations);
  await deployer.deploy(Token, 'SubDAO Governance', 'GOV', new BN('1000000000').mul(UNIT));
};
