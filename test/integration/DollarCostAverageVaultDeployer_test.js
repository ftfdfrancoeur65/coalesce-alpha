const { expect } = require("chai");
const { ethers } = require("hardhat");
const networks = require('../../config/networks.json');
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, Percent, TradeType } = require('@uniswap/sdk');
const { BigNumber } = require("ethers");

describe("Vault", function () {
  let vaultDeployer;
  let signer;

  beforeEach(async function () {
    const chainId = ChainId.MAINNET;

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [networks.mainnet.test_wallet]
    });

    signer = await ethers.provider.getSigner(networks.mainnet.test_wallet);

    await network.provider.send("hardhat_setBalance", [
      networks.mainnet.test_wallet,
      ethers.utils.hexValue(ethers.utils.parseEther("2")._hex),
    ]);

    const daiData = await Fetcher.fetchTokenData(
      chainId, networks.mainnet.dai, ethers.provider
    );
    const weth = WETH[chainId];
    const pair = await Fetcher.fetchPairData(daiData, weth, ethers.provider);

    const route = new Route([pair], weth);
    const trade = new Trade(route, new TokenAmount(weth, ethers.utils.parseEther("1")), TradeType.EXACT_INPUT);
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
      { value: value.toString()}
    );

    await uniswapTx.wait();
    // const { deployer } = await getNamedAccounts()
    // let dai = (await ethers.getContractAt(
    //   '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    //   networks.mainnet.dai)).connect(signer);

    // let cDai = (await ethers.getContractAt(
    //   '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    //   networks.mainnet.cdai)).connect(signer);

    let VaultDeployer = await ethers.getContractFactory("DollarCostAverageVaultDeployer");
    VaultDeployer = VaultDeployer.connect(signer);
    
    const SEVEN_DAYS_IN_SECONDS = 604800
    vaultDeployer = await VaultDeployer.deploy(SEVEN_DAYS_IN_SECONDS);
    await vaultDeployer.deployed();
  });

  it("deployable", async function () {
    expect(await vaultDeployer.owner()).to.equal(signer._address);
  });
});