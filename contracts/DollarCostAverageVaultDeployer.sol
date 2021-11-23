pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "hardhat/console.sol";

import "./DollarCostAverageVault.sol";

contract DollarCostAverageVaultDeployer is Ownable {

  DollarCostAverageVault[] private activeDCAVaults;

  uint public processingFee;

  uint public minimumIntervalInSeconds; 

  uint public lastBlockTimeStamp;

  event NewVaultCreated(
    address indexed vaultAddress
  );

  constructor(uint _minimumIntervalInSeconds) {
    minimumIntervalInSeconds = _minimumIntervalInSeconds;
    lastBlockTimeStamp = block.timestamp;
  }

  function newDCAVault(uint _frequency, uint _periods, address _vaultDepositor, IERC20 _underlying, IERC20 _target) public{
      DollarCostAverageVault vault = new DollarCostAverageVault(_frequency, _periods, _vaultDepositor, _underlying, _target, _processingFee);
      activeDCAVaults.push(vault);
      emit NewVaultCreated(address(vault));
    }

  function checkUpkeep(bytes calldata ) external returns (bool upkeepNeeded, bytes memory ) {
        upkeepNeeded = (block.timestamp - lastBlockTimeStamp) > minimumIntervalInSeconds;
    }

  function performUpkeep(bytes calldata /* performData */) external {
      for (uint i = 0; i<activeDCAVaults.length; i++) {     
        if(activeDCAVaults[i].isReady()){
          activeDCAVaults[i].processDCA();
        }
      }
  }

  function setPerformanceFee(uint _amount) public onlyOwner {
    processingFee = _amount;
  }
}