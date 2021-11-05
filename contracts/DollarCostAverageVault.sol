pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract DollarCostAverageVault is Ownable {
  IERC20 public target;
  IERC20 public underlying;
  uint public DCAInterval;
  uint public lastDCAEventBlockTimeStamp;
  uint public periodsProcessed;
  uint public totalPeriods;
  ICToken public cTokenBase;


  function isReady() external override returns(bool isReady){
    isReady = (block.timestamp - lastDCAEventBlockTimeStamp) > DCAInterval;
  }

  function processDCA() external override {
    uint amountToDCA = calculateAmountToDCA();
    require(cTokenBase.redeemUnderlying(amountToDCA) == 0, "Base redemption did not work");
    IERC20 to = _vault.target();
    underlying.approve(address(uniswapRouter), underlyingReceived);
    uint received = uniswapRouter.swapExactTokensForTokens(underlyingReceived, outMin, path, address(this), deadline)[path.length-1];
  }

  function calculateAmountToDCA() private view returns(uint amountToDCA){
    uint balanceUnderlying = cTokenBase.balanceOfUnderlying(address(this));
    if((totalPeriods - 1) == periodsProcessed){
      amountToDCA = balanceUnderlying;
    }else{
      balanceUnderlying.div(totalPeriods - periodsProcessed);
    }
  }

}