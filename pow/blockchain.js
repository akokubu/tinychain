"use strict";

const SHA256 = require("crypto-js/sha256")
const { ec } = require("elliptic");

const EC = new ec("secp256k1");
const now = () => Math.floor(new Date().getTime() / 1000);
const genesisBlock = () => new Block(0, "0", now(), "{}", 0);
const toHexString = (bytes) => {
  return Array.from(bytes, (byte) => {
    console.log(("0" + (byte & 0xff).toString(16)).slice(-2))
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
}

class Tinycoin {
  constructor(wallet, difficulty = 2) {
    this.blocks = [genesisBlock()];
    this.pool = new TxPool();
    this.wallet = wallet ? wallet : new Wallet(); // コインベースを受け取るウォレット
    this.difficulty = difficulty;
    this.stopFlg = false;
  }

  latestBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  addBlock(newBlock) {
    this._validBlock(newBlock);
    this.blocks.push(newBlock);
  }

  _validBlock(block) {
    const preBlock = this.latestBlock();
    const expHash = Block.hash(block.height, block.preHash, block.timestamp, block.data, block.nonce);
    if (preBlock.height + 1 !== block.height) {
      // ブロック高が直前のブロックの次であるかチェック
      throw new Error(`invalid height. expected: ${preBlock.height + 1}`);
    } else if (preBlock.hash !== block.preHash) {
      // 前ブロックハッシュ値が直前のブロックのハッシュ値と一致するかチェック
      throw new Error(`invalid preHash. expected: ${preBlock.hash}`);
    } else if (expHash !== block.hash) {
      // ハッシュ値が正しく計算されているかチェック
      throw new Error(`invalid hash. expected: ${expHash}`);
    } else if (!block.hash.startsWith("0".repeat(this.difficulty))) {
      // difficultyの要件を満たすかチェック
      throw new Error(`invalid hash. expected to start from ${"0".repeat(this.difficulty)}`)
    }
  }

  async genNextBlock() {
    return new Promise((resolve) => {
      let nonce = 0;
      const pre = this.latestBlock();
      const coinbaseTx = this._genCoinbaseTx();
      const intervalId = setInterval(() => {
        const data = this.pool.txs.reduce((pre, tx) => pre + tx.toString(), coinbaseTx.toString());

        const block = new Block(pre.height + 1, pre.hash, now(), data, nonce);
        // hash値のhexの先頭に'0'が'difficulty'個以上つけば正規のブロックにんある
        if (block.hash.startsWith("0".repeat(this.difficulty))) {
          clearInterval(intervalId);
          // NOTE: タイミング次第でバグとなりうる危険なコード
          // 全てのutxoがブロックに取り込まれたとしtxpoolを空にする
          const spentTxs = this.pool.txs;
          this.pool.txs = [];
          this.pool.updateUnspentTxs(spentTxs);
          this.pool.unspentTxs.push(coinbaseTx);
          resolve(block);
        }
        nonce++; // nonceをインクリメントすることでhash値に変化をつける
        // difficulty=2の場合、先頭にゼロが2つ揃う確率は1/256
        // 1秒に32回試行するから256/32=8秒の一回だけブロックを生成する
      }, 1000 / 32)
    })
  }

  async startMining() {
    while(!this.stopFlg) {
      const block = await this.genNextBlock();
      this.addBlock(block);
      console.log(`new block mined! block number is ${block.height}`);
    }
  }

  _genCoinbaseTx() {
    // minerへの報酬として支払われるコンベーストランザクション
    // inputがなくて、outputがminberのウォレット
    return this.wallet.signTx(new Transaction("", this.wallet.pubKey));
  }

}

class Block {
  constructor(height, preHash, timestamp, data, nonce) {
    this.height = height;
    this.preHash = preHash;
    this.timestamp = timestamp;
    this.data = data;
    this.nonce = nonce;
    this.hash = Block.hash(height, preHash, timestamp, data, nonce);
  }

  static hash(height, preHash, timestamp, data, nonce) {
    return SHA256(`${height},${preHash},${timestamp},${data}, ${nonce}`).toString();
  }
}

class Transaction {
  constructor(inHash, outAddr, sig = "") {
    this.inHash = inHash;
    this.inSig = sig;
    this.outAddr = outAddr;
    this.hash = Transaction.hash(inHash, outAddr);
  }

  toString() {
    return JSON.stringify(this);
  }

  static hash(inHash, outAddr) {
    return SHA256(`${inHash},${outAddr}`).toString();
  }
}

class TxPool {
  constructor() {
    this.txs = [];
    this.unspentTxs = [];
  }

  addTx(tx) {
    TxPool.validateTx(this.unspentTxs, tx);
    this.txs.push(tx);
  }

  balanceOf(address) {
    return this.unspentTxs.filter((tx) => tx.outAddr === address).length;
  }

  updateUnspentTxs(spentTxs) {
    spentTxs
      .map((tx) => tx.inHash)
      .forEach((spentHash) => {
        // Txが消費されたかチェック
        const index = this.unspentTxs.findIndex((unspentTx) => unspentTx.hash === spentHash);
        if (index === -1) {
          return;
        }
        // 未消費リストから消し込み
        this.unspentTxs.splice(index, 1);
      })
    this.unspentTxs.push(...spentTxs); // spentTxsのoutAddrが新たな未消費分となる
  }

  static validateTx(unspentTxs, tx) {
    // hash値が正しく計算されているかチェック
    if (tx.hash !== Transaction.hash(tx.inHash, tx.outAddr)) {
      throw new Error(`invalid tx hash. expected: ${Transaction.hash(tx.inHash, tx.outAddr)}`)
    }
    // 消費済みトランザクションではないか（未消費のトランザクションであることを確認)
    const inTx = unspentTxs.find((unspentTx) => unspentTx.hash === tx.inHash);
    if (!inTx) throw new Error(`tx in not found`);
    // 署名が正当化どうかチェック
    if (!TxPool.validateSig(tx, inTx.outAddr)) {
      throw new Error(`invalid signature`)
    }
  }

  static validateSig(tx, address) {
    const key = EC.keyFromPublic(address, "hex");
    // console.log(address)
    // console.log(`key: ${key}`)
    // console.log(`tx.hash: ${tx.hash}`)
    // console.log(`tx.inSig: ${tx.inSig}`)

    return key.verify(tx.hash, tx.inSig);
  }
}

class Wallet {
  constructor(key) {
    this.key = key ? key : EC.genKeyPair(); // 秘密鍵の生成
    this.priKey = this.key.getPrivate();
    this.pubKey = this.key.getPublic().encode("hex"); // この公開鍵をアドレスとして使う
  }

  signTx(tx) {
    tx.inSig = toHexString(this.key.sign(tx.hash).toDER());
    return tx;
  }
}

module.exports = { Wallet, Transaction, Tinycoin };