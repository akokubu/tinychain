"use strict";

const { writeFileSync, readFileSync} = require("fs");
const { Command } = require("commander");
const axios = require("axios");
const { ec } = require('elliptic');
const { Wallet, Transaction } = require("./blockchain");
const { readWallet } = require("./utils");

const EC = new ec("secp256k1");
const program = new Command();
program.name("TinyWallet").description("wallet for tinychain").version("1.0.0");

program
  .command("wallet")
  .argument("<name>", "wallet name")
  .option("-d, --dir <string>", "priv key exporting directory", "./wallet")
  .description("create new wallet")
  .action(async (subCmd, options) => {
    const wallet = new Wallet();
    console.log(`wallet address is ${wallet.pubKey}`);
    writeFileSync(
      `${options.dir}/privkey-${subCmd}`,
      wallet.priKey.toString(16)
    );
  });

program
  .command("balance")
  .description("show balance of specific address")
  .argument("<address>", "wallet address")
  .option("-p, --port <number>", "the port json endpoint", 3001)
  .action(async (subCmd, options) => {
    const result = await axios.get(
      `http://localhost:${options.port}/balance/${subCmd}`
    );
    console.log(result.data);
  });

program
  .command("transfer")
  .description("transfer coin to somebody")
  .argument("<address>", "recipient wallet address")
  .requiredOption("-w, --wallet <string>", "the location of private key")
  .requiredOption("-a --amount <number>", "the amount of coin to send")
  .option("-p --port <number>", "the port json endpoint", 3001)
  .action(async (subCmd, options) => {
    const wallet = new Wallet(readWallet(options.wallet));
    const tx = wallet.signTx(new Transaction(wallet.pubKey, subCmd, options.amount));
    const result = await axios.post(`http://localhost:${options.port}/sendTransaction`, tx);
    console.log(result.data);
  });

program.parse();

process.on("unhandleRejection", (err) => {
  console.log(err);
  process.exit(1);
});
