/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

require('dotenv').config()

const HDWalletProvider = require("@truffle/hdwallet-provider");

const keys = {
  api: process.env.INFURA,
  kovan: process.env.KOVAN_KEY,
  etherscan: process.env.ETHERSCAN_KEY,
}
module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 7545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
     gasPrice: 150 * 1e9    // 150 Gwei
    },
    kovan: {
      provider: () => new HDWalletProvider(
        keys.kovan,
        `https://kovan.infura.io/v3/${keys.api}`,
      ),
      network_id: 42,       // Kovan's id
      gas: 5500000,
      gasPrice: 40 * 1e9, // https://kovan.etherscan.io/chart/gasprice
      confirmations: 0,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 10,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true,     // Skip dry run before migrations? (default: false for public nets )
      networkCheckTimeout: 10000,
    },

    mainnet: {
      provider: () => new HDWalletProvider(
        keys.mainnet,
        `https://mainnet.infura.io/v3/${keys.api}`,
      ),
      network_id: 1,         // Mainnet's id
      gas: 1500000,            // A tight gas limit, original 5500000
      gasPrice: 100 * 1e9,  // 100 Gwei
      confirmations: 0,      // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 100,    // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true,      // Skip dry run before migrations? (default: false for public nets )
      networkCheckTimeout: 30000
    }
  },
  compilers: {
    solc: {
      version: "^0.8.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 100,
        }
      }
    }
  },

  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    etherscan: keys.etherscan
  }
};
