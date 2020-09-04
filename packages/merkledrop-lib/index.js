const merklize = require('./merklize');

function combineProofs(proofs) {
    let proofBuff = Buffer.from([]);
    for (let proofArray of proofs) {
        for (let proof of proofArray) {
            if (!proof.startsWith('0x')) {
                // console.error({proof});
                throw new Error('Proof elements must start with 0x');
            }
            proofBuff = Buffer.concat([proofBuff, Buffer.from(proof.substring(2), 'hex')]);
        }
    }
    const combinedProof = '0x' + proofBuff.toString('hex');
    const proofLengths = proofs.map(ps => ps.length);
    return {combinedProof, proofLengths};
}

module.exports = {merklize, combineProofs};