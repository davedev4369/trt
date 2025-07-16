import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";
import TronWeb from "tronweb";
import bip39 from "bip39";
import hdkey from "hdkey";

const {
  SEED_PHRASE,
  ETH_FORWARD_TO,
  TRX_FORWARD_TO,
  ETH_RPC_URL,
} = process.env;

// ===== Ethereum Setup =====
const ethProvider = new ethers.JsonRpcProvider(ETH_RPC_URL);
const ethWallet = ethers.Wallet.fromPhrase(SEED_PHRASE).connect(ethProvider);

// ===== TRON Setup =====
const seed = await bip39.mnemonicToSeed(SEED_PHRASE);
const root = hdkey.fromMasterSeed(seed);
const tronNode = root.derive("m/44'/195'/0'/0/0");
const tronPrivateKey = tronNode.privateKey.toString("hex");

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io",
  privateKey: tronPrivateKey,
});

// ===== ETH Forwarding =====
async function forwardEth() {
  try {
    const balance = await ethProvider.getBalance(ethWallet.address);
    const gasPrice = await ethProvider.getGasPrice();
    const gasLimit = 21000n;
    const fee = gasPrice * gasLimit;

    if (balance > fee) {
      const value = balance - fee;
      const tx = await ethWallet.sendTransaction({
        to: ETH_FORWARD_TO,
        value,
        gasLimit,
        gasPrice,
      });
      console.log(`✅ ETH forwarded: ${tx.hash}`);
    } else {
      console.log("ℹ️ ETH balance too low.");
    }
  } catch (err) {
    console.error("ETH Error:", err.message);
  }
}

// ===== TRX Forwarding =====
async function forwardTrx() {
  try {
    const address = tronWeb.address.fromPrivateKey(tronPrivateKey);
    const balance = await tronWeb.trx.getBalance(address); // in SUN

    const fee = 500000; // Reserve 0.5 TRX (~ bandwidth/safety)
    if (balance > fee) {
      const amount = balance - fee;
      const tx = await tronWeb.trx.sendTransaction(TRX_FORWARD_TO, amount);
      if (tx.result) {
        console.log(`✅ TRX forwarded: ${tx.txid}`);
      } else {
        console.log("❌ TRX send failed. No txID returned.");
      }
    } else {
      console.log(`ℹ️ TRX balance too low. TRX Balance: ${balance / 1e6} TRX`);
    }
  } catch (err) {
    console.error("TRX Error:", err.message);
  }
}

// ===== Main Loop =====
async function mainLoop() {
  console.log("🔁 Forwarder bot started...");
  while (true) {
    await forwardEth();
    await forwardTrx();
    await new Promise((r) => setTimeout(r, 10000)); // 10 sec delay
  }
}

mainLoop();
