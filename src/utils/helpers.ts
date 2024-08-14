import {
    Field,
    PrivateKey,
    PublicKey,
    TokenId,
} from 'o1js';

export { addresses, keys, randomAccounts, tokenIds, stringToBigInt, bigintToString };


const savedKeys = [
    'EKFcUu4FLygkyZR8Ch4F8hxuJps97GCfiMRSWXDP55sgvjcmNGHc',
    'EKENfq7tEdTf5dnNxUgVo9dUnAqrEaB9syTgFyuRWinR5gPuZtbG',
    'EKEPVj2PDzQUrMwL2yeUikoQYXvh4qrkSxsDa7gegVcDvNjAteS5',
    'EKDm7SHWHEP5xiSbu52M1Z4rTFZ5Wx7YMzeaC27BQdPvvGvF42VH',
    'EKEuJJmmHNVHD1W2qmwExDyGbkSoKdKmKNPZn8QbqybVfd2Sd4hs',
    'EKEyPVU37EGw8CdGtUYnfDcBT2Eu7B6rSdy64R68UHYbrYbVJett',
];

/**
 * Predefined accounts keys, labeled by the input strings. Useful for testing/debugging with consistent keys.
 */
function randomAccounts<K extends string>(
    createNewAccounts: boolean,
    ...names: [K, ...K[]]
): { keys: Record<K, PrivateKey>; addresses: Record<K, PublicKey> } {
    let base58Keys = createNewAccounts
        ? Array(6)
            .fill('')
            .map(() => PrivateKey.random().toBase58())
        : savedKeys;
    let keys = Object.fromEntries(
        names.map((name, idx) => [name, PrivateKey.fromBase58(base58Keys[idx])])
    ) as Record<K, PrivateKey>;
    let addresses = Object.fromEntries(
        names.map((name) => [name, keys[name].toPublicKey()])
    ) as Record<K, PublicKey>;
    return { keys, addresses };
}

let { keys, addresses } = randomAccounts(
    process.env.USE_CUSTOM_LOCAL_NETWORK === 'true',
    'tokenX',
    'tokenY',
    'dex',
    'user'
);
let tokenIds = {
    X: TokenId.derive(addresses.tokenX),
    Y: TokenId.derive(addresses.tokenY),
    lqXY: TokenId.derive(addresses.dex),
};


/**
 * Convert a string to a BigInt
 * @param str - The string to convert
 * @returns - The BigInt representation of the string
 */
function stringToBigInt(str: string): bigint {
    let bigint = BigInt(0);
    for (let i = 0; i < str.length; i++) {
      bigint = bigint * BigInt(256) + BigInt(str.charCodeAt(i));
    }
    return bigint;
  }
  
  /**
   * Convert a BigInt back to a string
   * @param bigint - The BigInt to convert
   * @returns - The string representation of the BigInt
   */
  function bigintToString(field: Field): string {
    let str = '';
    let bigint = field.toBigInt();
    while (bigint > 0) {
      str = String.fromCharCode(Number(bigint % BigInt(256))) + str;
      bigint = bigint / BigInt(256);
    }
    return str;
  }