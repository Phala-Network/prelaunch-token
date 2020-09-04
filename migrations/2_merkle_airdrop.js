const MerkleAirdrop = artifacts.require("MerkleAirdrop");

module.exports = async function(deployer) {
  await deployer.deploy(MerkleAirdrop);
};
