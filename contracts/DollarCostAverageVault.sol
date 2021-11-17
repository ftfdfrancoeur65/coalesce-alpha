pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';


contract DollarCostAverageVault is Ownable {
  IERC20 public target;
  IERC20 public underlying;
  uint public DCAInterval;
  address public depositer;
  uint public lastDCAEventBlockTimeStamp;
  uint public periodsProcessed;
  uint public totalPeriods;
  ICToken public cTokenBase;
  IUniswapV2Router02 public uniswapRouter;

   constructor(uint _frequency, uint _periods, address _vaultDepositor) {
    DCAInterval = _frequency;
    depositer = _vaultDepositor;
    totalPeriods = _periods;
  }

  function isReady() external returns(bool readyForProcessing){
    readyForProcessing = (block.timestamp - lastDCAEventBlockTimeStamp) > DCAInterval;
  }

  function processDCA() external {
    uint amountToDCA = calculateAmountToDCA();
    address[] memory path = new address[](3);
    path[0] = address(underlying);
    path[1] = uniswapRouter.WETH();
    path[3] = address(target);
    uint deadline = block.timestamp;
    require(cTokenBase.redeemUnderlying(amountToDCA) == 0, "Base redemption did not work");
    underlying.approve(address(uniswapRouter), amountToDCA);
    uint received = uniswapRouter.swapExactTokensForTokens(amountToDCA, 0, path, address(this), deadline)[path.length-1];
  }

  function calculateAmountToDCA() public payable returns(uint amountToDCA){
    uint balanceUnderlying = cTokenBase.balanceOfUnderlying(address(this));
    if((totalPeriods - 1) == periodsProcessed){
      amountToDCA = balanceUnderlying;
    }else{
      balanceUnderlying / (totalPeriods - periodsProcessed);
    }
  }

}