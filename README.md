<p align="center">
  <img src="./media/fhnx_cover.svg#gh-light-mode-only" type="image/svg+xml" width="75%"/>
</p>

<p align="center">
  The JavaScript SDK for Fhenix
</p>

<p align="center">
  <img alt="npm" src="https://img.shields.io/npm/v/fhenixjs" />
  <img alt="ci" style="margin-left: 0.3em" src="https://github.com/fhenixprotocol/fhenix.js/actions/workflows/test.yml/badge.svg?branch=main" />
</p>

<p align="center">
  <a href="https://fhenixjs.fhenix.zone" target="_blank"><strong>Explore the Docs »</strong></a>
</p>

## General

fhenix.js allows developers to add support for encrypted data when developing dApps on Fhenix.
fhenix.js includes easy helpers for encryption, unsealing and helpers to create apps that utilize private data.

## Installation

### NodeJS

(only node 20+ is supported until I fix this)

```bash
# Using npm
npm install fhenixjs
```

### Browser Installation (or simpler bundling)

For browsers or environments that don't want to mess with WASM bundling, we recommend installing the prepackaged versions directly
which is available in the ./dist/ folder in this repo.

You can also install from a CDN e.g.

`https://cdn.jsdelivr.net/npm/fhenixjs@0.3.0-alpha.1/dist/fhenix.umd.min.js`

#### ESM

You can install as a module:

```
<script type="module">
    import { fhenixjs } from "./dist/fhenix.esm.min.js";
</script>
```

#### UMD

Or from a UMD:

```
<script id="fhenixjs" src="./dist/fhenix.umd.min.js"></script>
```

#### NextJS WASM Bundling

FhenixJS uses WASM for all the FHE goodness. If you're using the non-prepackaged version you'll need to configure next.js to properly use WASM via the `next.config.js` file. 

Otherwise, you can use the prepackaged version above that avoids having to bundle WASM.

Here's a working config I managed to conjure up from various Github and StackOverflow issues (please suggest improvements):

```javascript
/** @type {import('next').NextConfig} */

module.exports = {
  webpack: (config, { isServer }) => {
    
    patchWasmModuleImport(config, isServer);

    if (!isServer) {
      config.output.environment = { ...config.output.environment, asyncFunction: true };
    }
    return config
    }
}

function patchWasmModuleImport(config, isServer) {
  config.experiments = Object.assign(config.experiments || {}, {
    asyncWebAssembly: true,
    layers: true,
    topLevelAwait: true
  });

  config.optimization.moduleIds = 'named';

  config.module.rules.push({
    test: /\.wasm$/,
    type: 'asset/resource',
  });

  // TODO: improve this function -> track https://github.com/vercel/next.js/issues/25852
  if (isServer) {
    config.output.webassemblyModuleFilename = './../static/wasm/tfhe_bg.wasm';
  } else {
    config.output.webassemblyModuleFilename = 'static/wasm/tfhe_bg.wasm';
  }
}
```

#### Other Bundlers/Frameworks

If you have any problems with bundlers or frameworks, please open an issue in this repo and/or reach out on Discord/TG.

Also, if you had to fiddle with a bundler or config to get it working, please share the config with us so we can add it as a reference for others!


#### Mobile Support

Completely untested. Maybe yes, maybe no, maybe both.

## fhenix.js sdk

`cofhejs` is designed to make interacting with FHE enabled blockchains typesafe and as streamlined as possible by providing utility functions for inputs, permits (permissions), and outputs. The sdk is an opinionated implementation of the underling `Permit` class, therefor if the sdk is too limiting for your use case (e.g. multiple active users), you can easily drop down into the core `Permit` class to extend its functionality.

NOTE: `cofhejs` is still in beta, and while we will try to avoid it, we may release breaking changes in the future if necessary.

The sdk can be imported by:
```typescript
import { cofhejs } from "fhenix.js"
```

Before interacting with your users' permits, you must first initialize the sdk:
```typescript
await cofhejs.initialize({
  provider: userProvider,   // Implementation of AbstractAccount in `types.ts`
  signer: userSigner,       // Implementation of AbstractSigner in `types.ts`
})
```

NOTE: When the user changes, it is recommended to re-initialize the sdk with the updated `provider` and `signer`


then, to create a new Permit, simply:
```typescript
await cofhejs.createPermit({
  type: "self",
  issuer: userAddress,
})

// Alternatively, you can create a permit with the default options:
// type: "self"
// issuer: address of signer passed into `cofhejs.initialize`
await cofhejs.createPermit()
```

### Permissions
Now that the user has an active permit, we can extract the relevant `Permission` data from that permit:
```typescript
const permit = cofhejs.getPermit()
const permission = permit.getPermission()
```

which can then be used as an argument for a solidity function:
```solidity
function getCounterPermitSealed(
  Permission memory permission
) public view withPermission(permission) returns (SealedUint memory) {
  return FHE.sealoutputTyped(userCounter[permission.issuer], permission.sealingKey);
}
```
NOTE: We will return to this `SealedUint` output struct in the "Output data" section below.

You can read more about how Permits enable Fhenix to privately fetch encrypted data from on-chain by taking a look at our [docs](https://docs.fhenix.zone/docs/devdocs/FhenixJS/Permits) or the [`Permissioned.sol` contract](https://github.com/FhenixProtocol/fhenix-contracts/blob/main/contracts/access/Permissioned.sol).


### Input data
Passing data to the contracts involves an additional step where the user's encryptable variables are encrypted. FHE enabled contracts require private data to be passed in as `EncryptedUintXX` (or the other variants), which requires pre-encryption using the FHE enabled network's publicKey. 

For a solidity function:
```solidity
function add(inEuint32 calldata encryptedValue) public {
  euint32 value = FHE.asEuint32(encryptedValue);
  userCounter[msg.sender] = userCounter[msg.sender] + value;
}
```

We need to pass an encrypted value into `inEuint32`. Using `cofhejs` this is accomplished by:
```typescript
const encryptableValue = Encryptable.uint32(5);
const encryptedArgs = client.encrypt(encryptableValue)
//    ^? encryptedArgs - [EncryptedUint32]
```

These args can now be sent to the contract. `.encrypt` will also replace `"permission"` with the user's currently active permit `permission` referenced above. It will also recursively encrypt any nested input data (`[...]` / `{...}`):
```typescript
const encrypted = client.encrypt(
  "permission", // <== Will be replaced by the user's active `Permit.getPermission()`
  Encryptable.uint8(5),
  [Encryptable.uint128("50"), Encryptable.bool(true)],
  50n,
  "hello"
)
// typeof encrypted - [Permission, EncryptedUint8, [EncryptedUint128, EncryptedBool], bigint, string]
```

### Output data (sealed)
Encrypted data is sealed before it is returned to the users, at which point it can be unsealed on the client. By using the structs `SealedUint` / `SealedBool` / `SealedAddress` provided in `FHE.sol`, the sealed output variables can be automatically decrypted into the correct type using `cofhejs.unseal`.

A function with the following return type:
```solidity
function getSealedData(Permissioned memory permission) view returns (uint256, string memory, SealedUint memory, SealedUint memory, SealedBool memory);
```

can be unsealed with `cofhejs`:
```typescript
const data = await contract.getSealedData(permission);

const unsealed = await client.unseal(data)
//    ?^ - [bigint, string, bigint, bigint, bool]
```

As with `cofhejs.encrypt` above, `unseal` will also recursively unseal any nested data structures.

### Notes

- `cofhejs` uses `zustand` behind the scenes to persist your user's Permits. These zustand stores can be imported directly to be used as part of hooks. In the future we will also expose hooks to streamline interacting with the sdk in your react enabled dApps.
- We plan to provide viem hooks inspired by `scaffold-eth`'s `useScaffoldContractRead` and `useScaffoldContractWrite` to automatically encrypt input data, inject permissions, and unseal output data.

## `FhenixClient` and `FhenixClientSync`

`FhenixClient` uses the legacy Permission system (V1), it is recommended to migrate to `cofhejs` and `Permit`s above.

### Usage

```javascript
// initialize your web3 provider
const provider = new JsonRpcProvider("http://localhost:8545");

// initialize Fhenix Client
const client = new FhenixClient({ provider });

// to encrypt data for a Fhenix contract
let encrypted = await client.encrypt(5, EncryptionTypes.uint8);
// ... call contract with `encrypted`

// to unseal data from a Fhenix contract
const cleartext = client.unseal(contractAddress, sealed);
```

### Sync Fhenix Client

If you need to use the `encrypt_xxxx()` functions of FhenixClient synchronously (ex: top level of a component / in a hook), then you may want to use `FhenixClientSync`.

```javascript
// Created using a static method instead of the `new` keyword
const clientSync = await FhenixClientSync.create({ provider });

// to encrypt data for a Fhenix contract (sync)
let encrypted = clientSync.encrypt(5, EncryptionTypes.uint8);
// ... call contract with `encrypted`
```

`FhenixClientSync` and `FhenixClient` share all functionality other than the async/sync `encrypt_xxxx()` functions.

By default, `FhenixClientSync` is configured to only use the default security zone 0. If you need to interact with additional security zones, they can be initialized when creating the sync client as follows:

```javascript
const clientSync = await FhenixClientSync.create({
  provider,
  securityZones: [0, 1],
});
```

### Permits & Access Control

We recommend the helper `Permit` structure, which is a built-in method for providing access control for your FHE-enabled view functions.

#### Credits

This project is based on [fhevmjs](https://github.com/zama-ai/fhevmjs) by Zama and utilizes [tfhe.rs](https://github.com/zama-ai/tfhe-rs) to provide FHE functionality

#### Need support?

Open an issue or Pull Request on Github! Or reach out to us on [Discord](https://discord.com/invite/FuVgxrvJMY) or Telegram.
