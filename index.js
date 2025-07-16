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

// ===== ETH Setup =====
const ethProvider = new ethers.JsonRpcProvider(ETH_RPC_URL);
const ethWallet = ethers.Wallet.fromPhrase(SEED_PHRASE).connect(ethProvider);

// ===== TRON Setup =====
const seed = await bip39.mnemonicToSeed(SEED_PHRASE);
const root = hdkey.fromMasterSeed(seed);
const tronNode = root.derive("m/44'/195'/0'/0/0");
const tronPrivateKey = tronNode.privateKey.toString("hex");

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io",
  privateKey: tronPrivateKey
});

// ===== ETH Forwarding =====
async function forwardEth() {
  try {
    const balance = await ethProvider.getBalance(ethWallet.address);
    const min = ethers.parseEther("0.0002");

    if (balance > min) {
      const tx = await ethWallet.sendTransaction({
        to: ETH_FORWARD_TO,
        value: balance - ethers.parseEther("0.00001")
      });
      console.log(`✅ ETH forwarded: ${tx.hash}`);
    } else {
      console.log("ℹ️ ETH balance too low.");
    }
  } catch (err) {
    console.error("❌ ETH Error:", err.message);
  }
}

// ===== TRX Forwarding =====
async function forwardTrx() {
  try {
    const balance = await tronWeb.trx.getBalance(tronWeb.defaultAddress.base58);
    console.log("TRX Balance:", balance / 1e6, "TRX");

    if (balance > 200000) {
      const amountToSend = balance - 1500000; // leave ~0.1 TRX
      const tx = await tronWeb.trx.sendTransaction(TRX_FORWARD_TO, amountToSend);

      if (tx.result && tx.txid) {
        console.log(`✅ TRX forwarded: ${tx.txid}`);
      } else {
        console.log("❌ TRX send failed. No txID returned.");
        console.log("🔍 TRX send result:", tx);
      }
    } else {
      console.log("ℹ️ TRX balance too low.");
    }
  } catch (err) {
    console.error("❌ TRX Error:", err.message);
  }
}

// ===== Main Loop =====
async function mainLoop() {
  console.log("🔁 Bot started...");
  while (true) {
    await forwardEth();
    await forwardTrx();
    await new Promise(r => setTimeout(r, 1000)); // 1 second
  }
}

mainLoop();
