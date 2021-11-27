const networks = require('../config/networks.json');

module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId
}) => {

  const SEVEN_DAYS_IN_SECONDS = 604800
  const HOUR_IN_SECONDS = 3600
  const quickswapRouter = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
  const TWELVE_WEEKS = 12
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("Deployer Address: ", deployer)
  const vaultDeployer = await deploy('DollarCostAverageVaultDeployer',
    {
      from: deployer,
      args: [HOUR_IN_SECONDS, quickswapRouter],
      log: true
    }
  )
  log("Vault Deployer Contract deployed at: " + vaultDeployer.address)

}
module.exports.tags = ['all', 'vaultDeployer', 'main']
