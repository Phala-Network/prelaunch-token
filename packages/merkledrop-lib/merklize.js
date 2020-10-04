// Modified from: https://github.com/1Hive/airdrop-app/blob/master/app/src/merklize.js

const MerkleTree = require("merkle-tree-solidity").default;
const { bufferToHex, keccak256, setLengthLeft, toBuffer } = require("ethereumjs-util");
const BN = require('bn.js');

const bn0 = new BN(0);
const bn1e15 = new BN('1000000000000000');

// @param data - object with addressField and amountField; address: hex string, amount: number in Unit (1e18 wei)
module.exports = function(data, addressField, amountField, includeFields) {
  let awards = data.reduce((prev, curr) => {
    const address = curr[addressField];
    const existing = prev.find(u => u.address.toLowerCase() === address.toLowerCase());
    const amount = curr[amountField];
    if(existing) {
      existing.amount = (existing.amount || 0) + amount;
    } else {
      const award = {address, amount};
      if (Array.isArray(includeFields)) {
        includeFields.forEach(f => award[f] = curr[f])
      };
      prev.push(award);
    }
    return prev;
  }, []);

  awards = awards.map(r => {
    r.amountBN = bn1e15.muln(Math.round(r.amount * 1000) | 0);  // keep 3 decimals
    return r;
  }).filter(r => !r.amountBN.eq(bn0));

  const awardHashBuffers = awards.map(r => {
    const addressBuffer = toBuffer(r.address);
    const amountBuffer = setLengthLeft(toBuffer("0x" + r.amountBN.toString(16)), 32);
    const preimage = Buffer.concat([addressBuffer, amountBuffer]);
    const hashBuffer = keccak256(preimage);
    r.amount = r.amount.toFixed();
    // console.log('preimage', preimage.toString('hex'))
    return hashBuffer;
  });

  const merkleTree = new MerkleTree(awardHashBuffers);
  const root = bufferToHex(merkleTree.getRoot());

  awards.forEach((award,idx) => {
    award.proof = merkleTree.getProof(awardHashBuffers[idx]).map(p => bufferToHex(p));
    return award;
  })

  // console.log(`root:`, root);

  return {root, awards};
}
