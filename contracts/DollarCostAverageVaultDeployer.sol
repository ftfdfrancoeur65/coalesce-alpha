pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "hardhat/console.sol";

import "../strategies/IStrat.sol";
import "../DollarCostAverageVault.sol";

contract DollarCostAverageVaultDeployer is Ownable {

    struct DollarCostAverageVault {
      bool isActive;
    }

  mapping(address => DollarCostAverageVault) private DCAVaults;
  address[] private activeDCAVaults;

  uint public processingFee;

  uint public minimumIntervalInSeconds; 

  uint public lastBlockTimeStamp;

  constructor(uint _minimumIntervalInSeconds) {
    minimumIntervalInSeconds = _minimumIntervalInSeconds;
    lastBlockTimeStamp = block.timestamp;
  }

  function checkUpkeep(bytes calldata ) external override returns (bool upkeepNeeded, bytes memory ) {
        upkeepNeeded = (block.timestamp - lastBlockTimeStamp) > minimumIntervalInSeconds;
    }

  function performUpkeep(bytes calldata /* performData */) external override {
      for (uint i = 0; i<activeDCAVaults.length; i++) {
        
        if(DCAVaults[activeDCAVaults[i]].isReady){
          DCAVaults[activeDCAVaults[i]].processDCA;
        }
      }
  }
}