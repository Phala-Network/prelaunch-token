# Phala ERC20

## Install dependencies

Prefer node.js v12.16.2

```bash
yarn
```

## Deploy

```bash
truffle migrate --network mainnet
```

## Verify on Etherscan

```bash
truffle run verify PHAToken --network mainnet
```

## Approve MultiSend.co

```bash
truffle console --network mainnet
```

Then in the console:

```js
pha = await PHAToken.deployed()
UNIT = new web3.utils.BN('1000000000000000000')
await pha.approve('0x941f40c2955ee09ba638409f67ef27c531fc055c', UNIT.muln(10000))
```
