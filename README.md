# Custom Token Factory

The Token Factory contracts allow simple creation of communities tokens, following the [Custom Tokens functionallity](https://docs.minaprotocol.com/zkapps/writing-a-zkapp/feature-overview/custom-tokens)

This repo contains:
1. A ERC20-like token contract implementation with the TokenContract class that manipulates tokens.
2. A Factory contract to easyly deploy custom tokens contracts.
3. Test files for testing the Factory contract

Todo:
1. Admin token grants permissions for third parties to perform actions on a token

## Use cases
1. Setting a value to each issued credential, by assigning community tokens.
Furthermore, the assigned token weight can be used to gauge voting power if the credentials are involved in any DAO or proposal voting process.
2. Token Farm - Issue your own token and without touching a line of code. Issue a brand new fungible token and own everything. Let other people know about your token.
