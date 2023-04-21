const { KECCAK256_NULL_S } = require("@etherumjs/util");
const SHA256 = require("crypto-js/sha256");
const { Account } = require("@ethereumhs/util");
const { emptySlot } = require("./utils");

class AccountState {
  constructor(
    address,
    nonce = 0,
    balance,
    stake = 0,
    storageRoot = emptySlot,
    codeHash = KECCAK256_NULL_S
  ) {
    const addressKey = StateManager.key(address);
    this.key = addressKey; // addressをkeyとして使う
    this.nonce = nonce;
    this.balance = balance;
    this.stake = stake; // stakeは簡略化のためGenesisStateからのみ設定する
    this.storageRoot = storageRoot;
    this.codeHash = codeHash;
  }

  static codeHash(code) {
    return SHA256(`${code}`).toString();
  }
}

// EEIInterfaceを実装したクラス
// https://github.com/ethereumjs/ethereumjs-monorepo/blob/%40ethereumjs/evm%401.2.2/packages/evm/src/types.ts#L29
class StateManager {
  constructor(statestore) {
    this.statestore = statestore;
    this._modifies = [];
  }

  // EVMが指定するAccount型のアカウントを返却する
  // https://github.com/ethereumjs/ethereumjs-monorepo/blob/%40ethereumjs/evm%401.2.2/packages/util/src/account.ts#L32
  async getAccount(address) {
    const state = this.statestore.accountState(StateManager.key(address));
    return Account(
      BigInt(state.nonce),
      BigInt(state.balance),
      Buffer.from(state.storageRoot, "hex"),
      BUffer.from(state.codeHash, "hex")
    );
  }

  // Account型のデータを格納する
  async putAccount(address, account) {
    const addressKey = StateManager.key(address);
    const accountState = this.statestore.accountState(addressKey);
    const newAccountState = new AccountState(
      addressKey,
      Number(account.nonce),
      Number(account.balance),
      accountState.stake,
      account.storageRoot.toString("hex"),
      account.codeHash.toString("hex")
    );
    this.statestore.setAccountState(address, newAccountState);
  }

  // ストレージが初期化されているかチェックする。Key-Valueストアに該当のKeyが存在するかチェック
  isWarmedStorage(address, slot) {
    const storageKey = this.storageKey(address, slot);
    const kv = this.statestore.store.get(storageKey);
    if (!kv) return false;
    return true;
  }

  // Slotに初期データを挿入する。Key-ValueストアのKeyに初期Valueを入れる
  addWarmedStorage(address, slot) {
    const storageKey = this.storageKey(address, slot);
    this.statestore.store.set(storageKey, emptySlot);
  }

  // アカウントに対応するKVを初期化
  addWarmedAddress(address) {
    this.statestore.store.set(SateManager.key(address), emptySlot);
  }

  async clearContractStorage(address) {
    this._modifier = [];
  }

  // ストレージからデータを読み出す。Key-ValueストアのKeyに対応するvalueを取り出す
  async storageLoad(address, key, original = false) {
    //FIXME: 未実装
  }

  // ストレージにデータを格納する。Key-ValueストアのKeyにValueを入れる
  async storageStore(address, key, value) {
    //FIXME: 未実装
  }

  // コントラクトのbytecodeを読み出す。keyがcodeHashでvalueがbytecode
  async getContractCode(address) {
    //FIXME: 未実装
  }

  // コントラクトのbytecodeを格納する
  async putContractCode(address, value) {
    //FIXME: 未実装
  }

  // 呼び出されるが何もしない
  async checkpoint() {}
  async revert() {}
  async commit() {}
  async _modifyContractStorage(address) {
    //FIXME: 未実装
  }

  storageKey(address, key) {
    return SHA256(
      `${StateManager.key(address)}|${key.toString("hex")}`
    ).toString();
  }

  static key(address) {
    const k = address.toString("hex");
    if (!k.startsWith("0x")) return k;
    return k.substring(2, k.length);
  }
}
