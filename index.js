import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";
import TronWeb from "tronweb";
import bip39 from "bip39";
import hdkey from "hdkey";

// ENV variables
const {
  SEED_PHRASE,
  ETH_FORWARD_TO,
  TRX_FORWARD_TO,
  ETH_RPC_URL
} = process.env;

// --- Ethereum Setup ---
const ethProvider = new ethers.JsonRpcProvider(ETH_RPC_URL);
const ethWallet = ethers.Wallet.fromPhrase(SEED_PHRASE).connect(ethProvider);

// --- Tron Setup ---
const seed = await bip39.mnemonicToSeed(SEED_PHRASE);
const root = hdkey.fromMasterSeed(seed);
const tronNode = root.derive("m/44'/195'/0'/0/0");
const tronPrivateKey = tronNode.privateKey.toString("hex");

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io",
  privateKey: tronPrivateKey
});

// --- ETH Forward ---
async function forwardEth() {
  const balance = await ethProvider.getBalance(ethWallet.address);

  if (balance.gt(0)) {
    const gasPrice = await ethProvider.getGasPrice();
    const estimatedGas = 21000n;
    const fee = gasPrice * estimatedGas;

    if (balance > fee) {
      const value = balance - fee;
      const tx = await ethWallet.sendTransaction({
        to: ETH_FORWARD_TO,
        value,
        gasLimit: estimatedGas,
        gasPrice,
      });
      console.log(`🟢 ETH forwarded: ${tx.hash}`);
    } else {
      console.log("⚠️ ETH balance too low after gas.");
    }
  } else {
    console.log("ℹ️ ETH balance is 0.");
  }
}

// --- TRX Forward ---
async function forwardTrx() {
  const address = tronWeb.defaultAddress.base58;
  const balance = await tronWeb.trx.getBalance(address);

  if (balance > 100000) {
    const amount = balance - 50000; // leave ~0.05 TRX for fee
    try {
      const tx = await tronWeb.trx.sendTransaction(TRX_FORWARD_TO, amount);
      if (tx.txID) {
        console.log(`🟢 TRX forwarded: ${tx.txID}`);
      } else {
        console.log("❌ TRX send failed. No txID returned.");
      }
    } catch (err) {
      console.error("TRX Error:", err?.message || err);
    }
  } else {
    console.log("⚠️ TRX balance too low.");
  }
}

// --- Main Loop ---
async function mainLoop() {
  console.log("🚀 Wallet forwarder started...");
  while (true) {
    try {
      await forwardEth();
      await forwardTrx();
    } catch (e) {
      console.error("❌ Error:", e.message);
    }

    await new Promise(r => setTimeout(r, 10000)); // ⏱️ 10 seconds delay
  }
}

mainLoop();
