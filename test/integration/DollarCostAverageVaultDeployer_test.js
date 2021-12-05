const { expect } = require("chai");
const { ethers } = require("hardhat");
const networks = require('../../config/networks.json');
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, Percent, TradeType } = require('@uniswap/sdk');
const { BigNumber } = require("ethers");

describe("Vault", function () {
  let vaultDeployer;
  let signer;
  const SEVEN_DAYS_IN_SECONDS = 604800
  const TWELVE_WEEKS = 12
  let newVault;
  let dai;
  let cDai;
  let walletBalanceOfDai;
  let wethContract;

  beforeEach(async function () {
    const chainId = ChainId.MAINNET;
    cDai = (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      networks.mainnet.cdai)).connect(signer);
    dai = (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      networks.mainnet.dai)).connect(signer);
    wethContract = (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      networks.mainnet.weth)).connect(signer);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [networks.mainnet.test_wallet]
    });

    signer = await ethers.provider.getSigner(networks.mainnet.test_wallet);

    await network.provider.send("hardhat_setBalance", [
      networks.mainnet.test_wallet,
      ethers.utils.hexValue(ethers.utils.parseEther("300")._hex),
    ]);

    const daiData = await Fetcher.fetchTokenData(
      chainId, networks.mainnet.dai, ethers.provider
    );
    const weth = WETH[chainId];
    const pair = await Fetcher.fetchPairData(daiData, weth, ethers.provider);

    const route = new Route([pair], weth);
    const trade = new Trade(route, new TokenAmount(weth, ethers.utils.parseEther("2")), TradeType.EXACT_INPUT);
    const slippageTolerance = new Percent('50', '10000');
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;

    const uniswap = new ethers.Contract(
      networks.mainnet.uniswap,
      ['function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'],
      signer
    );
    const path = [weth.address, networks.mainnet.dai];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const value = trade.inputAmount.raw;


    const uniswapTx = await uniswap.swapExactETHForTokens(
      amountOutMin.toString(),
      path,
      networks.mainnet.test_wallet,
      deadline,
      { value: value.toString() }
    );

    await uniswapTx.wait();

    let VaultDeployer = await ethers.getContractFactory("DollarCostAverageVaultDeployer");
    VaultDeployer = VaultDeployer.connect(signer);
    let uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    vaultDeployer = await VaultDeployer.deploy(SEVEN_DAYS_IN_SECONDS, uniswapRouter);
    await vaultDeployer.deployed();
  });

  it("deployable", async function () {
    expect(await vaultDeployer.owner()).to.equal(signer._address);
  });

  it("allows for adding a vault", async function () {
    let addVaultTx = await vaultDeployer.addVaultAddress("0xd54C71868A4f5d34d59bE6c68d06E671b380668D")
    await addVaultTx.wait();
    let vaultStatus = await vaultDeployer.vaultAddresses("0xd54C71868A4f5d34d59bE6c68d06E671b380668D")
    expect(vaultStatus).to.equal(true);
  });

  it("can DCA into a target when ready", async function () {
    let tx = await vaultDeployer.newDCAVault(
      SEVEN_DAYS_IN_SECONDS,
      TWELVE_WEEKS,
      signer._address,
      networks.mainnet.dai,
      networks.mainnet.weth
    )
    let receipt = await tx.wait();
    let { args } = receipt.events?.filter((x) => { return x.event == "NewVaultCreated" })[0]

    let numberOfActiveVaults = await vaultDeployer.numberOfActiveVaults();
    expect(numberOfActiveVaults).to.eq(1)
    let daiDepositAmount = ethers.utils.parseUnits("1000",18);
    newVault = await ethers.getContractAt('DollarCostAverageVault', args['vaultAddress'])
    await dai.approve(newVault.address, daiDepositAmount)
    newVault = newVault.connect(signer)
    let depositTx = await newVault.depositBase(daiDepositAmount)
    await depositTx.wait()
    let vaultBalanceDaiBefore = await dai.balanceOf(newVault.address)
    expect(await dai.balanceOf(newVault.address)).to.eq(daiDepositAmount); 
    let upkeepArgs = ethers.utils.arrayify([0, 50])
    console.log("BYTES: ", upkeepArgs)
    console.log("IS BYTES: ", ethers.utils.isBytes(upkeepArgs));
    let dcaTx = await vaultDeployer.performUpkeep(upkeepArgs);
    await dcaTx.wait();
    walletBalanceOfDai = await dai.balanceOf(signer._address)
    let wethBalanceInContract = await wethContract.balanceOf(newVault.address) 

    expect(wethBalanceInContract).to.be.above(0)  
    let lastDCABlockTimestamp = await newVault.lastDCAEventBlockTimeStamp()

    let expectedDaiSwapAmount = vaultBalanceDaiBefore.div(12)
    expect(await dai.balanceOf(newVault.address)).to.eq(vaultBalanceDaiBefore.sub(expectedDaiSwapAmount))  
    expect(lastDCABlockTimestamp.toString()).to.not.eq('0'); 
    expect(await newVault.isReady()).to.eq(false);
    expect(await newVault.periodsProcessed()).to.eq(1);
    let withdrawTx = await newVault.connect(signer).withdrawBase(ethers.utils.parseUnits("60",18))
    await withdrawTx.wait();
    let newBalance = await dai.balanceOf(signer._address)
    expect(newBalance).to.eq(walletBalanceOfDai.add(ethers.utils.parseUnits("60",18)))
  });
});