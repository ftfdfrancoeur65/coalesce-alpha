const { SamplePage } = require('twilio/lib/rest/autopilot/v1/assistant/task/sample');

module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId
}) => {
  
  const networks = require('../config/networks.json');
  const SEVEN_DAYS_IN_SECONDS = 604800
  const HOUR_IN_SECONDS = 3600
  const TWELVE_WEEKS = 12
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("Deployer Address: ", deployer)
  let args = [HOUR_IN_SECONDS, networks.polygon.sushi_router]
  const vaultDeployer = await deploy('DollarCostAverageVaultDeployer',
    {
      from: deployer,
      args: args,
      log: true
    }
  )
  log("Vault Deployer Contract deployed at: " + vaultDeployer.address)
  setTimeout(()=>{
    run("verify:verify", {
      address: vaultDeployer.address,
      constructorArguments: args
    });
  },10000)

}
module.exports.tags = ['all', 'vaultDeployer', 'main']
