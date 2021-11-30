// frequency 3600
// periods 5
// vaultDepositer 0x4993eA3aaE13aAfc433Ad66fe756f91E253622CA
// underlying 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
// target 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619

// 5000000000000000000
const networks = require('../config/networks.json')

// This script only works with --network 'mainnet', or 'hardhat' when running a fork of mainnet 
task("vault-setup", "sets up eth dai vault and deposits")
  .setAction(async () => {
    let args = [
      3600,
      5,
      '0x4993eA3aaE13aAfc433Ad66fe756f91E253622CA',
      '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
    ]
    const { deployments } = require('hardhat');
    const VaultDeployer = await deployments.get('DollarCostAverageVaultDeployer')
    console.log(VaultDeployer.address)
    let [deployer] = await ethers.getSigners();

    let ethDaiVault = await ethers.getContractAt('DollarCostAverageVault','0xB5d0B2801f707b02752184DEB7003158b4887711',deployer)
    let daiDepositAmount = ethers.utils.parseUnits('5', 18)
    dai = (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      networks.polygon.dai)).connect(deployer);
    let tx = await dai.approve(ethDaiVault.address, daiDepositAmount)
    await tx.wait();
    let allowance = await dai.allowance(deployer.address, ethDaiVault.address)
    console.log(allowance.toString())
  
    let estimateDepositTx = await ethDaiVault.depositBase(daiDepositAmount);
    estimateDepositTx.wait();
  })

module.exports = {}
