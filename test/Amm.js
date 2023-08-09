const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.parseUnits(n.toString(), 'ether')
}

const shares = tokens

describe('AMM', () => {
  let token1,
      token2,
      amm

  let accounts, 
      deployer,
      liquidityProvider,
      investor1,
      investor2

  beforeEach(async () => {
    // Setup Accounts
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    liquidityProvider = accounts[1]
    investor1 = accounts[2]
    investor2 = accounts[3]

    let holders = [deployer, liquidityProvider, investor1, investor2]

    // Deploy Tokens
    const Token = await ethers.getContractFactory('Token')
    token1 = await Token.deploy('MyToken', 'TOKN', '1000000')
    token2 = await Token.deploy('SyZyGy', 'CZG', '1000000')

    // Send tokens to liquidityProvider
    let transaction = await token1.connect(deployer).transfer(liquidityProvider, tokens(100000))
    await transaction.wait()
    
    transaction = await token2.connect(deployer).transfer(liquidityProvider, tokens(100000))
    await transaction.wait()

    // Send token1 to investor1 & token2 to investor2
    transaction = await token1.connect(deployer).transfer(investor1, tokens(100000))
    await transaction.wait()
    
    transaction = await token2.connect(deployer).transfer(investor2, tokens(100000))
    await transaction.wait()


    // Deploy AMM
    const AMM = await ethers.getContractFactory('AMM')
    amm = await AMM.deploy(token1, token2)
})

  describe('Deployment', () => {

    it('has an address', async () => {
      expect(await amm.getAddress()).to.not.equal(0x0)
    })

    it('tracks tokens addresses', async () => {
      expect(await amm.token1()).to.equal(await token1.getAddress())
      expect(await amm.token2()).to.equal(await token2.getAddress())
    })

    // it('has correct symbol', async () => {
    //   expect(await token.symbol()).to.equal(symbol)
    // })

  })

  describe('Swapping tokens', () => {

    let amount, transaction, result, estimate, balance
    
    it('facilitates swaps', async () => {
      // Deployer  approves 100k tokens
      amount = tokens(100000)

      transaction = await token1.connect(deployer).approve(amm,amount)
      await transaction.wait()

      transaction = await token2.connect(deployer).approve(amm,amount)
      await transaction.wait()

      // Deployer adds liquidity
      transaction = await amm.connect(deployer).addLiquidity(amount,amount)
      await transaction.wait()

      // AMM receives tokens ?
      expect(await token1.balanceOf(amm)).to.equal(amount)
      expect(await token2.balanceOf(amm)).to.equal(amount)

      expect(await amm.token1Balance()).to.equal(amount)
      expect(await amm.token2Balance()).to.equal(amount)

      // Check deployer as 100 shares
      expect(await amm.shares(deployer)).to.equal(tokens(100))

      // Check pool has 100 total shares
      expect(await amm.totalShares()).to.equal(tokens(100))


      ///////////////
      // LP adds more liquidity
      ///////////////

      // Approves 50k 
      amount = tokens(50000)
      transaction = await token1.connect(liquidityProvider).approve(amm,amount)
      await transaction.wait()

      transaction = await token2.connect(liquidityProvider).approve(amm,amount)
      await transaction.wait()

      // LP Adds liquidity
      let token2Deposit = await amm.calculateToken2Deposit(amount)
      transaction = await amm.connect(liquidityProvider).addLiquidity(amount,token2Deposit)
      await transaction.wait()

      // Check LP as 50 shares
       expect(await amm.shares(liquidityProvider)).to.equal(tokens(50))

      // Check AMM now has 150 shares
      expect(await amm.totalShares()).to.equal(tokens(150))




      // Investor1 approves all tokens
      transaction = await token1.connect(investor1).approve(amm,amount)
      await transaction.wait()

      // Check price before swap
      console.log(`\n\t - Price: ${Number(await amm.token2Balance())/Number(await amm.token1Balance())}`)
      
      // Check investor balance before swap
      balance = await token2.balanceOf(investor1)
      console.log(`\t - Investor1 token2 balance before swap:, ${ethers.formatEther(balance)}`)

      // Estimates amounts of tokens investor1 will receive after swapping token1, inlcuding slipage
      estimate = await amm.calculateToken1Swap(tokens(1))
      console.log(`\t - Token 2 amount investor1 will receive after swap: ${ethers.formatEther(estimate)}`)

      // Investor1 Swaps token1
      transaction = await amm.connect(investor1).swapToken1(tokens(1))
      await transaction.wait()
      
      //Check Swap event
      await expect(transaction).to.emit(amm, 'Swap')
        .withArgs(
        investor1.address,
        token1.target,  // same as await token1.getAddress(),
        tokens(1),
        token2.target,
        estimate,
        await amm.token1Balance(),
        await amm.token2Balance(),
        (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
       )

      // Check Investor1 balance after swap
      balance = await token2.balanceOf(investor1)
      console.log(`\t - Investor1 token 2 balance after swap: ${ethers.formatEther(balance)}`)
      expect(estimate).to.equal(balance)

      // Check AMM token balances are in sync
      expect(await token1.balanceOf(amm)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm)).to.equal(await amm.token2Balance())

      //Check price after swap
      console.log(`\t - Price: ${Number(await amm.token2Balance()) / Number(await amm.token1Balance())}\n`)
     

      //////////////////////////////////////////////
      // Investor1 swaps again 
      ////////////////////////

      //Swap more tokens to see what happens
      // Check investor balance before swap
      balance = await token2.balanceOf(investor1)
      console.log(`\t - Investor1 token2 balance before swap: ${ethers.formatEther(balance)}`)

      // Estimates amounts of tokens investor1 will receive after swapping token1, inlcuding slipage
      estimate = await amm.calculateToken1Swap(tokens(1))
      console.log(`\t - Token 2 amount investor1 will receive after swap: ${ethers.formatEther(estimate)}`)

      transaction = await amm.connect(investor1).swapToken1(tokens(1))
      await transaction.wait()

      // Check Investor1 balance after swap
      balance = await token2.balanceOf(investor1)
      console.log(`\t - Investor1 token 2 balance after swap: ${ethers.formatEther(balance)}`)

      // Check AMM token balances are in sync
      expect(await token1.balanceOf(amm)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm)).to.equal(await amm.token2Balance())

      //Check price after swap
      console.log(`\t - Price: ${Number(await amm.token2Balance()) / Number(await amm.token1Balance())}\n`)


      //////////////////////////////////////////////
      // Investor1 swaps large amount
      ////////////////////////////////

      //Swap large amount of tokens to see what happens
      // Check investor balance before swap
      balance = await token2.balanceOf(investor1)
      console.log(`\t - Investor1 token2 balance before swap: ${ethers.formatEther(balance)}`)

      // Estimates amounts of tokens investor1 will receive after swapping token1, inlcuding slipage
      estimate = await amm.calculateToken1Swap(tokens(10000))
      console.log(`\t - Token 2 amount investor1 will receive after swap: ${ethers.formatEther(estimate)}`)

      transaction = await amm.connect(investor1).swapToken1(tokens(10000))
      await transaction.wait()

      // Check Investor1 balance after swap
      balance = await token2.balanceOf(investor1)
      console.log(`\t - Investor1 token 2 balance after swap: ${ethers.formatEther(balance)}`)

      // Check AMM token balances are in sync
      expect(await token1.balanceOf(amm)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm)).to.equal(await amm.token2Balance())

      // Check price after swaping large amount
      console.log(`\t - Price: ${Number(await amm.token2Balance()) / Number(await amm.token1Balance())}\n`)
     

      //////////////////////////////////////////////////
      // Investor 2 Swaps
      ////////////////////

      // Investor 2 approves all tokens
      transaction = await token2.connect(investor2).approve(amm,amount)
      await transaction.wait()

      // Check investor balance before swap
      balance = await token1.balanceOf(investor2)
      console.log(`\t - Investor2 token1 balance before swap:, ${ethers.formatEther(balance)}`)

      // Estimates amounts of tokens investor2 will receive after swapping token 2: includes slippage 
      estimate = await amm.calculateToken2Swap(tokens(1))
      console.log(`\t - Token 1 amount investor2 will receive after swap: ${ethers.formatEther(estimate)}`)

      // Investor 2 Swaps 1 token
      transaction = await amm.connect(investor2).swapToken2(tokens(1))
      await transaction.wait()

      // Check swap event
      await expect(transaction).to.emit(amm, 'Swap')
      .withArgs(
        investor2.address,
        token2.target,
        tokens(1),
        token1.target,
        estimate,
        await amm.token1Balance(),
        await amm.token2Balance(),
        (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
      )

      // Check Investor2 balance after swap
      balance = await token1.balanceOf(investor2)
      console.log(`\t - Investor2 token1 balance after swap: ${ethers.formatEther(balance)}`)
      expect(estimate).to.equal(balance)

      // Check AMM token balances are in sync
       expect(await token1.balanceOf(amm)).to.equal(await amm.token1Balance())
       expect(await token2.balanceOf(amm)).to.equal(await amm.token2Balance())

      // Check price after swap
      console.log(`\t - Price: ${Number(await amm.token2Balance())/Number(await amm.token1Balance())}\n`)
        

      /////////////////////////
      // Removing Liquidity
      ///////

      console.log(`AMM Token 1 Balance: ${ethers.formatEther(await amm.token1Balance())}\n`)
      console.log(`AMM Token 2 Balance: ${ethers.formatEther(await amm.token2Balance())}\n`)

      // Check LP Balances before removing tokens
      balance = await token1.balanceOf(liquidityProvider.address)
      console.log(`Liquidity provider token 1 balance before removing funds: ${ethers.formatEther(balance)} \n`)

      balance = await token2.balanceOf(liquidityProvider.address)
      console.log(`Liquidity provider token 2 balance before removing funds: ${ethers.formatEther(balance)} \n`)

      //LP removes tokens from AMM pool
      transaction = await amm.connect(liquidityProvider).removeLiquidity(shares(50))
      await transaction.wait()

      // Check LP Balances after removing tokens
      balance = await token1.balanceOf(liquidityProvider.address)
      console.log(`Liquidity provider token 1 balance after removing funds: ${ethers.formatEther(balance)} \n`)

      balance = await token2.balanceOf(liquidityProvider.address)
      console.log(`Liquidity provider token 2 balance after removing funds: ${ethers.formatEther(balance)} \n`)

      // LP should have 0 shares
      expect(await amm.shares(liquidityProvider.address)).to.equal(0)
      expect(await amm.shares(deployer.address)).to.equal(shares(100))


      //AMM Pool has 100 total shares
      expect(await amm.totalShares()).to.equal(shares(100))


    })
  })
})
