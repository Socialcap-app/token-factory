
import {
  method,
  Mina,
  AccountUpdate,
  SmartContract,
  PublicKey,
  TokenId,
  Field,
  UInt64
} from 'o1js';
import { bigintToString, stringToBigInt } from './utils/helpers.js';
import { CommunityToken } from './community-token.js';


class TokenHolder extends SmartContract {
  @method async approveSend(amount: UInt64) {
    this.balance.subInPlace(amount);
  }
}

let Local = await Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [sender, tokenAccount1] = Local.testAccounts;
let initialBalance = 10_000_000;
let supply = 100_000_000;

const [tokenAccount, ownerAccount] = Mina.TestPublicKey.random(2);

let token = new CommunityToken(tokenAccount);
let tokenId = token.deriveTokenId();

let owner = new TokenHolder(ownerAccount, tokenId);
let tx;

console.log('Community Token Contract Account', tokenAccount.toBase58());
console.log('TokenHolderAccount', ownerAccount.toBase58());
console.log('receiverAddress', tokenAccount1.toBase58());
console.log('feePayer', sender.toBase58());
console.log('-------------------------------------------');

await CommunityToken.compile();
await TokenHolder.compile();

console.log('deploy tokenZkApp');
tx = await Mina.transaction(sender, async () => {
  await token.deploy();

  AccountUpdate.fundNewAccount(sender).send({
    to: token.self,
    amount: initialBalance,
  });

  token.initialize(Field(stringToBigInt('Community Token')), Field(stringToBigInt('CMT')), UInt64.from(9), UInt64.from(supply), Field(""));
  
});
await tx.prove();
await tx.sign([sender.key, tokenAccount.key]).send();



console.log('deploy zkAppOwner');
tx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender, 1);
  await owner.deploy();
  await token.approveAccountUpdates([owner.self]);
});
console.log('deploy zkAppOwner (proof)');
await tx.prove();
await tx.sign([sender.key, ownerAccount.key]).send();


console.log('mint the entire supply to the token account with the same address as the sender');
tx = await Mina.transaction(sender, async () => {
  await token.mint(ownerAccount, UInt64.from(supply));
});
await tx.prove();
await tx.sign([sender.key]).send();
console.log(`balanceOf the owner:  ${(await token.balanceOf(ownerAccount)).value.toBigInt()}`);


console.log('approve send from owner');
tx = await Mina.transaction(sender, async () => {
  // Pay for tokenAccount1's account creation
  AccountUpdate.fundNewAccount(sender);
  await owner.approveSend(UInt64.from(1_000));

  // we call the token contract with the tree
  await token.transfer(owner.self, tokenAccount1, 1_000);
});
console.log('approve send (proof)');
await tx.prove();
await tx.sign([sender.key]).send();

console.log(
  `tokenAccount1's balance for tokenId: ${TokenId.toBase58(tokenId)}`,
  Mina.getBalance(tokenAccount1, tokenId).value.toBigInt()
);
console.log("token id: ", TokenId.toBase58(tokenId));
console.log(`name: ${await token.name()}`);
console.log(`symbol: ${(await token.symbol())}`);
console.log(`decimals: ${(await token.decimals())}`);
console.log(`totalSupply: ${(await token.totalSupply()).value.toBigInt()}`);
console.log(`image: ${(await token.image())}`);
console.log(`balanceOf owner:  ${(await token.balanceOf(ownerAccount)).value.toBigInt()}`);
