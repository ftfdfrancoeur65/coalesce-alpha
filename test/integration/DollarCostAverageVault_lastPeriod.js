const { expect } = require("chai");
const { ethers } = require("hardhat");
const networks = require('../../config/networks.json');
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, Percent, TradeType } = require('@uniswap/sdk');
const { BigNumber } = require("ethers");

describe("Vault", function () {
  let vaultDeployer;
  let signer;
  const SEVEN_DAYS_IN_SECONDS = 604800
  const ONE_WEEK = 1
  let newVault;
  let dai;
  let cDai;
  let walletBalanceOfDai;

  beforeEach(async function () {
    const chainId = ChainId.MAINNET;
    cDai = (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      networks.mainnet.cdai)).connect(signer);
    dai = (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      networks.mainnet.dai)).connect(signer);
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
    vaultDeployer = await VaultDeployer.deploy(SEVEN_DAYS_IN_SECONDS);
    await vaultDeployer.deployed();
  });

  it("vault can be deposited in", async function () {
    let tx = await vaultDeployer.newDCAVault(
      SEVEN_DAYS_IN_SECONDS,
      ONE_WEEK,
      signer._address,
      networks.mainnet.dai,
      networks.mainnet.weth,
      0
    )
    let receipt = await tx.wait();
    let { args } = receipt.events?.filter((x) => { return x.event == "NewVaultCreated" })[0]

    let daiDepositAmount = ethers.utils.parseUnits("1000",18);
    newVault = await ethers.getContractAt('DollarCostAverageVault', args['vaultAddress'])
    await dai.approve(newVault.address, daiDepositAmount)
    let depositTx = await newVault.connect(signer).depositBase(daiDepositAmount)
    await depositTx.wait() 
  });

  it("can DCA into a target when ready", async function () {
    let dcaTx = await vaultDeployer.performUpkeep();
    await dcaTx.wait();
    expect(weth.balanceOf(newVault.address)).to.eq(1000000)
    expect(dai.balanceOf(newVault.address)).to.eq(0)
  });
});