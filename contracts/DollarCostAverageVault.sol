//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

contract DollarCostAverageVault is Ownable {

  using SafeERC20 for IERC20;
  IERC20 public target;
  IERC20 public underlying;
  uint public DCAInterval;
  address public depositer;
  uint public lastDCAEventBlockTimeStamp;
  uint public periodsProcessed;
  uint public totalPeriods;
  uint public processingFeeRate;
  address deployer;

  IUniswapV2Router02 public uniswapRouter;

   constructor(uint _frequency, uint _periods, address _vaultDepositor, IERC20 _underlying, IERC20 _target, uint _processingFee, IUniswapV2Router02 _router) {
    DCAInterval = _frequency;
    depositer = _vaultDepositor;
    totalPeriods = _periods;
    underlying = _underlying;
    target = _target;
    processingFeeRate = _processingFee; 
    deployer = msg.sender;
    uniswapRouter = _router;
  }

   event newDeposit(
    address indexed vaultAddress,
    address depositer,
    uint amount
  );

  event DCAEvent(
    address indexed vaultAddress,
    uint amount,
    address target
  );

  modifier onlyDepositer {
    require(msg.sender == depositer, "Must be depositer");
    _;
  }

  function processDCA() external {
    require((block.timestamp - lastDCAEventBlockTimeStamp) > DCAInterval, "not ready for dca");
    uint amountToDCA = calculateAmountToDCA();
    uint processingFee = calculateProcessingFee(amountToDCA);
    underlying.safeTransfer(deployer, processingFee);
    amountToDCA = amountToDCA - processingFee;
    address WETH = uniswapRouter.WETH();
    address[] memory path = new address[](3);
    if (address(underlying) == WETH || address(target) == WETH) {
      path = new address[](2);
      path[0] = address(underlying);
      path[1] = address(target);
  } else {
      path = new address[](3);
      path[0] = address(underlying);
      path[1] = WETH;
      path[2] = address(target);
  }
    uint deadline = block.timestamp;
    underlying.approve(address(uniswapRouter), amountToDCA);
    uniswapRouter.swapExactTokensForTokens(amountToDCA, 0, path, address(this), deadline)[path.length-1];
    periodsProcessed++;
    lastDCAEventBlockTimeStamp = block.timestamp;
    emit DCAEvent(address(this), amountToDCA, address(target));
  }

  function isReady() external view returns(bool readyForProcessing){
    readyForProcessing = (block.timestamp - lastDCAEventBlockTimeStamp) > DCAInterval;
  }

  function calculateProcessingFee(uint _amount) public view returns(uint fee){
    fee = processingFeeRate / 10000 * _amount;
  }

  function approveBaseDeposit(uint _amount) public {
    require(underlying.approve(address(this), _amount),"Approval did not work");
  }

  function depositBase(uint _amount) public payable {
    uint256 allowance = underlying.allowance(msg.sender, address(this));
    require(allowance >= _amount, "Check the token allowance");
    underlying.safeTransferFrom(msg.sender, address(this), _amount);
    emit newDeposit(address(this), msg.sender, _amount);
  }

  function withdrawBase(uint _amount) public payable onlyDepositer {
    underlying.safeTransfer(depositer, _amount);
  }

  function withdrawTarget(uint _amount) public payable onlyDepositer {
    target.safeTransfer(depositer, _amount);
  }

  function calculateAmountToDCA() public view returns(uint amountToDCA){
    uint balanceUnderlying = underlying.balanceOf(address(this));
    if((totalPeriods - 1) == periodsProcessed){
      amountToDCA = balanceUnderlying;
    }else{
      amountToDCA = balanceUnderlying / (totalPeriods - periodsProcessed);
    }
  }

}