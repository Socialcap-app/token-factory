import {
  method,
  Mina,
  AccountUpdate,
  SmartContract,
  PublicKey,
  TokenId,
  TokenContractV2 as TokenContract,
  AccountUpdateForest,
  CircuitString,
  Field,
  UInt64,
  ProvablePure,
  Struct,
  State,
  state,
  DeployArgs,
  Permissions,
  Bool
} from 'o1js';
import { bigintToString, stringToBigInt } from './utils/helpers.js';

export { CommunityToken };


type Erc20Like = {
  // pure view functions which don't need @method
  name?: () => Promise<CircuitString>;  // max 32 chars
  symbol?: () => Promise<CircuitString>;  // max 32 chars
  decimals?: () => Promise<UInt64>;
  totalSupply(): Promise<UInt64>;
  image(): Promise<CircuitString>;
  balanceOf(owner: PublicKey | AccountUpdate): Promise<UInt64>;

  // mutations which need @method
  transfer(
    from: PublicKey | AccountUpdate,
    to: PublicKey | AccountUpdate,
    value: UInt64
  ): Promise<void>; // emits "Transfer" event

  // events
  events: {
    Transfer: ProvablePure<{
      from: PublicKey;
      to: PublicKey;
      value: UInt64;
    }>;
  };
};

class CommunityToken extends TokenContract implements Erc20Like {
  // SUPPLY = UInt64.from(10n ** 18n);
  @state(Field) _name = State<Field>();
  @state(Field) _symbol = State<Field>();
  @state(UInt64) _decimals = State<UInt64>();
  @state(UInt64) _supply = State<UInt64>();
  @state(Field) _image = State<Field>();

  async deploy(args?: DeployArgs) {
    await super.deploy(args);

    // make account non-upgradable forever
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
      access: Permissions.proofOrSignature(),
    });
  }

  @method
  async initialize(name: Field, symbol: Field, decimals: UInt64, supply: UInt64, image: Field) {

    super.init();

    this._name.set(name);
    this._symbol.set(symbol);
    this._decimals.set(decimals);
    this._supply.set(supply);
    this._image.set(image)
  }

  @method
  async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method async mint(receiverAddress: PublicKey, amount: UInt64) {
    this.internal.mint({ address: receiverAddress, amount });
  }

  @method async burn(receiverAddress: PublicKey, amount: UInt64) {
    this.internal.burn({ address: receiverAddress, amount });
  }
  // ERC20 API
  async name() {
    return CircuitString.fromString(bigintToString(this._name.get()));
  }

  async symbol() {
    return CircuitString.fromString(bigintToString(this._symbol.get()));
  }

  async decimals() {
    return this._decimals.get();
  }

  async image(): Promise<CircuitString> {
    return CircuitString.fromString(bigintToString(this._image.get()));
  }

  async totalSupply() {
    return this._supply.get();
  }

  async balanceOf(owner: PublicKey | AccountUpdate) {
    let update =
      owner instanceof PublicKey
        ? AccountUpdate.create(owner, this.deriveTokenId())
        : owner;
    await this.approveAccountUpdate(update);
    return update.account.balance.getAndRequireEquals();
  }

  events = {
    Transfer: Struct({ from: PublicKey, to: PublicKey, value: UInt64 }),
  };
}