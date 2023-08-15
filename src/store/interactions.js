import { ethers } from 'ethers'

import {
  setProvider,
  setNetwork,
  setAccount
} from './reducers/provider'

import {
  setContracts,
  setSymbols,
} from './reducers/tokens'

// import {
//   setContract,
//   sharesLoaded,
//   swapsLoaded,
//   depositRequest,
//   depositSuccess,
//   depositFail,
//   withdrawRequest,
//   withdrawSuccess,
//   withdrawFail,
//   swapRequest,
//   swapSuccess,
//   swapFail
// } from './reducers/amm'

import TOKEN_ABI from '../abis/Token.json';
//import AMM_ABI from '../abis/AMM.json';
import config from '../config.json';

export const loadProvider = (dispatch) => {
  const provider =   new ethers.BrowserProvider(window.ethereum)
  dispatch(setProvider(provider))

  return provider
}

export const loadNetwork = async (provider, dispatch) => {
  const { chainId } = await provider.getNetwork()
  dispatch(setNetwork(chainId.toString()))

  return chainId
}

export const loadAccount = async (dispatch) => {
   const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
   const account = ethers.getAddress(accounts[0])
   dispatch(setAccount(account))

  return account
}

// ------------------------------------------------------------------------------
// LOAD CONTRACTS
export const loadTokens = async (provider, chainId, dispatch) => {
  const dapp = new ethers.Contract(config[chainId].dapp.address, TOKEN_ABI, provider)
  const usd = new ethers.Contract(config[chainId].usd.address, TOKEN_ABI, provider)

  dispatch(setContracts([dapp, usd]))
  //dispatch(setSymbols([await dapp.symbol(), await usd.symbol()]))
}