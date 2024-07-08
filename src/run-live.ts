import { expect } from 'expect';
import {
  AccountUpdate,
  Lightnet,
  Mina,
  PrivateKey,
  UInt64,
  fetchAccount,
} from 'o1js';
import os from 'os';
import { tic, toc } from './utils/tic-toc.node.js';
import {
  addresses,
  keys,
  tokenIds,
} from './utils/helpers.js';
import { CommunityToken as TokenContract } from './community-token.js';

const useCustomLocalNetwork = process.env.USE_CUSTOM_LOCAL_NETWORK === 'true';
// setting this to a higher number allows you to skip a few transactions, to pick up after an error
const successfulTransactions = 0;

tic('Run happy path, against real network.');
console.log();
const network = Mina.Network({
  mina: useCustomLocalNetwork
    ? 'http://localhost:8080/graphql'
    : 'https://berkeley.minascan.io/graphql',
  archive: useCustomLocalNetwork
    ? 'http://localhost:8282'
    : 'https://api.minascan.io/archive/berkeley/v1/graphql',
  lightnetAccountManager: 'http://localhost:8181',
});
Mina.setActiveInstance(network);

let tx, pendingTx: Mina.PendingTransaction, balances, oldBalances;

// compile contracts & wait for fee payer to be funded
const senderKey = useCustomLocalNetwork
  ? (await Lightnet.acquireKeyPair()).privateKey
  : PrivateKey.random();
const sender = senderKey.toPublicKey();
if (!useCustomLocalNetwork) {
  console.log(`Funding the fee payer account.`);
  await ensureFundedAccount(senderKey.toBase58());
}

await TokenContract.analyzeMethods();;

tic('compile (token)');
await TokenContract.compile();
toc();


let tokenX = new TokenContract(addresses.tokenX);
let tokenY = new TokenContract(addresses.tokenY);

let senderSpec = { sender, fee: 0.1e9 };
let userSpec = { sender: addresses.user, fee: 0.1e9 };

if (successfulTransactions <= 0) {
  tic('deploy & init token contracts');
  tx = await Mina.transaction(senderSpec, async () => {
    await tokenX.deploy();
    await tokenY.deploy();

    // pay fees for creating 2 token contract accounts, and fund them so each can create 1 account themselves
    const accountFee = Mina.getNetworkConstants().accountCreationFee;
    let feePayerUpdate = AccountUpdate.fundNewAccount(sender, 2);
    feePayerUpdate.send({ to: tokenX.self, amount: accountFee });
    feePayerUpdate.send({ to: tokenY.self, amount: accountFee });
  });
  await tx.prove();
  pendingTx = await tx.sign([senderKey, keys.tokenX, keys.tokenY]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();
}

toc();
console.log();
// Tear down
const keyPairReleaseMessage = await Lightnet.releaseKeyPair({
  publicKey: sender.toBase58(),
});
if (keyPairReleaseMessage) console.info(keyPairReleaseMessage);

async function ensureFundedAccount(privateKeyBase58: string) {
  let senderKey = PrivateKey.fromBase58(privateKeyBase58);
  let sender = senderKey.toPublicKey();
  let result = await fetchAccount({ publicKey: sender });
  let balance = result.account?.balance.toBigInt();
  if (balance === undefined || balance <= 15_000_000_000n) {
    await Mina.faucet(sender);
    await sleep(1);
  }
  return { senderKey, sender };
}

function logPendingTransaction(pendingTx: Mina.PendingTransaction) {
  if (pendingTx.status === 'rejected') throw Error('transaction failed');
  console.log(
    'tx sent: ' +
      (useCustomLocalNetwork
        ? `file://${os.homedir()}/.cache/zkapp-cli/lightnet/explorer/<version>/index.html?target=transaction&hash=${
            pendingTx.hash
          }`
        : `https://minascan.io/berkeley/tx/${pendingTx.hash}?type=zk-tx`)
  );
}

async function getTokenBalances() {
  // fetch accounts
  await Promise.all(
    [
      { publicKey: addresses.user },
      { publicKey: addresses.user, tokenId: tokenIds.X },
      { publicKey: addresses.user, tokenId: tokenIds.Y },
      { publicKey: addresses.user, tokenId: tokenIds.lqXY },
      { publicKey: addresses.dex },
      { publicKey: addresses.dex, tokenId: tokenIds.X },
      { publicKey: addresses.dex, tokenId: tokenIds.Y },
    ].map((a) => fetchAccount(a))
  );

  let balances = {
    user: { MINA: 0n, X: 0n, Y: 0n, lqXY: 0n },
    dex: { X: 0n, Y: 0n, lqXYSupply: 0n },
  };
  let user = 'user' as const;
  try {
    balances.user.MINA =
      Mina.getBalance(addresses[user]).toBigInt() / 1_000_000_000n;
  } catch {}
  for (let token of ['X', 'Y', 'lqXY'] as const) {
    try {
      balances[user][token] = Mina.getBalance(
        addresses[user],
        tokenIds[token]
      ).toBigInt();
    } catch {}
  }
  try {
    balances.dex.X = Mina.getBalance(addresses.dex, tokenIds.X).toBigInt();
  } catch {}
  try {
    balances.dex.Y = Mina.getBalance(addresses.dex, tokenIds.Y).toBigInt();
  } catch {}
  return balances;
}

async function sleep(sec: number) {
  return new Promise((r) => setTimeout(r, sec * 1000));
}