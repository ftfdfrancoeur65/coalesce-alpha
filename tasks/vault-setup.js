// frequency 3600
// periods 5
// vaultDepositer 0x4993eA3aaE13aAfc433Ad66fe756f91E253622CA
// underlying 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
// target 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619

// 5000000000000000000

// This script only works with --network 'mainnet', or 'hardhat' when running a fork of mainnet 
task("vault-setup", "sets up eth dai vault and deposits")
  .setAction(async () => {
    const { deployments, getNamedAccounts } = require('hardhat');
    const VaultDeployer = await deployments.get('DollarCostAverageVaultDeployer')
    console.log(VaultDeployer.address)
    let [deployer] = await ethers.getSigners();
    let vaultDeployer = new ethers.Contract(VaultDeployer.address, VaultDeployer.abi, deployer)
    let tx = await vaultDeployer.checkUpkeep(123);
    console.log(tx)
  })

module.exports = {}
