import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";
import TronWeb from "tronweb";
import bip39 from "bip39";
import hdkey from "hdkey";

// Load environment variables
const {
  SEED_PHRASE,
  ETH_FORWARD_TO,
  TRX_FORWARD_TO,
  ETH_RPC_URL,
} = process.env;

// 🔗 ETH Setup
const ethProvider = new ethers.JsonRpcProvider(ETH_RPC_URL);
const ethWallet = ethers.Wallet.fromPhrase(SEED_PHRASE).connect(ethProvider);

// 🔗 TRON Setup from BIP39 seed
const seed = await bip39.mnemonicToSeed(SEED_PHRASE);
const root = hdkey.fromMasterSeed(seed);
const tronNode = root.derive("m/44'/195'/0'/0/0");
const tronPrivateKey = tronNode.privateKey.toString("hex");
const tronAddress = TronWeb.address.fromPrivateKey(tronPrivateKey);

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io",
  privateKey: tronPrivateKey,
});

// ⛽ Forward ETH if above 0.001 ETH
async function forwardEth() {
  try {
    const balance = await ethProvider.getBalance(ethWallet.address);
    if (balance > ethers.parseEther("0.001")) {
      const tx = await ethWallet.sendTransaction({
        to: ETH_FORWARD_TO,
        value: balance - ethers.parseEther("0.0005"), // leave gas
      });
      console.log(`✅ ETH forwarded: ${tx.hash}`);
    } else {
      console.log("ℹ️ ETH balance too low.");
    }
  } catch (e) {
    console.error("❌ ETH Error:", e.message);
  }
}

// ⛽ Forward TRX if above 1 TRX (1_000_000 SUN)
async function forwardTrx() {
  try {
    const tronAddress = tronWeb.defaultAddress.base58;
    const balance = await tronWeb.trx.getBalance(tronAddress);
    const readableBalance = balance / 1_000_000;
    console.log(`TRX Balance: ${readableBalance} TRX`);

    const minReserve = 2_000_000; // Leave 2 TRX for fees
    if (balance > minReserve + 100_000) {
      const amountToSend = balance - minReserve;

      const result = await tronWeb.trx.sendTransaction(TRX_FORWARD_TO, amountToSend);
      console.log("🔍 TRX send result:", result);

      if (result && result.txID) {
        console.log(`✅ TRX forwarded: ${result.txID}`);
      } else {
        console.error("❌ TRX send failed. No txID returned.");
      }
    } else {
      console.log("ℹ️ TRX balance too low to forward safely.");
    }
  } catch (e) {
    console.error("❌ TRX Error:", e.message);
  }
}
// 🔁 Loop every 10 seconds
async function mainLoop() {
  console.log("🚀 Bot started...");
  while (true) {
    await forwardEth();
    await forwardTrx();
    await new Promise(r => setTimeout(r, 10000)); // 10s
  }
}

mainLoop();
