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
<script id="cofhejs" src="./dist/fhenix.umd.min.js"></script>
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

### Environment-specific Imports

cofhejs offers environment-specific entry points to ensure optimal compatibility across different platforms:

#### Browser Environments

For web applications, use the browser-specific entry point:

```typescript
import { cofhejs } from "cofhejs/web";
```

This entry point is optimized for browser environments and handles WASM loading properly in frontend frameworks like React, Vue, or vanilla JavaScript applications.

#### Node.js Environments

For Node.js applications, serverless functions, or test environments like Hardhat scripts:

```typescript
import { cofhejs } from "cofhejs/node";
```

This entry point is optimized for Node.js environments and ensures proper WASM loading without browser-specific dependencies.

### Initialization

Before interacting with your users' permits and encrypted data, initialize the sdk:

```typescript
// Basic initialization with provider and signer
await cofhejs.initialize({
  provider: userProvider,   // Implementation of AbstractAccount in `types.ts`
  signer: userSigner,       // Implementation of AbstractSigner in `types.ts`
})
```

See 

#### Re-initialization on User Change

When the user changes (e.g., wallet switch), re-initialize the sdk with the updated credentials:

```typescript
// Listen for account changes in your wallet connector
onAccountsChanged(async (accounts) => {
  const newAddress = accounts[0];
  // Get updated provider/signer for the new account
  const newProvider = getUpdatedProvider(newAddress);
  const newSigner = getUpdatedSigner(newAddress);
  
  // Re-initialize cofhejs with the new user
  await cofhejs.initialize({
    provider: newProvider,
    signer: newSigner
  });
});
```

### Creating and Managing Permits

Permits are a critical component for FHE interactions, allowing users to access their encrypted data:

```typescript
// Create a permit with default options (self-permit for the current user)
await cofhejs.createPermit()

// Create a permit with custom options
await cofhejs.createPermit({
  type: "self",             // "self" | "third-party" | "authorized"
  issuer: userAddress,      // The address issuing this permit
  expiration: 3600,         // Optional: Expiration time in seconds
  allowedFunctions: [       // Optional: Restrict to specific functions
    "getBalance",
    "transfer"
  ]
})

// Get the current active permit
const permit = cofhejs.getPermit()

// Extract permission data for contract calls
const permission = permit.getPermission()
```

### Encrypting Data for Contracts

To interact with FHE-enabled contracts, plaintext values must be encrypted before sending:

```typescript
// Encrypting a single value
const encryptedValue = cofhejs.encrypt(Encryptable.uint32(42))

// Encrypting multiple values in a single call
const encryptedArgs = cofhejs.encrypt([
  Encryptable.uint8(5),
  Encryptable.uint256("1000000000000000000"), // 1 ETH
  Encryptable.bool(true)
])

// Complex data structures with automatic permission injection
const encryptedData = cofhejs.encrypt({
  permission: "permission", // Special string that gets replaced with the active permission
  amount: Encryptable.uint128(1000),
  recipients: [
    {
      address: "0x123...",
      value: Encryptable.uint64(500)
    },
    {
      address: "0x456...",
      value: Encryptable.uint64(500)
    }
  ],
  memo: "Payment split"     // Non-encrypted fields pass through unchanged
})
```

#### Available Encryption Types

cofhejs supports all FHE data types:

```typescript
// Integer types
Encryptable.uint8(value)
Encryptable.uint16(value)
Encryptable.uint32(value)
Encryptable.uint64(value)
Encryptable.uint128(value)
Encryptable.uint256(value)

// Boolean type
Encryptable.bool(value)

// Address type (experimental)
Encryptable.address(value)
```

### Handling Encrypted Outputs (Unsealing)

When contracts return sealed encrypted data, use the `unseal` method to decrypt it:

```typescript
// Simple unsealing from a contract call
const sealedBalance = await myContract.getEncryptedBalance(permission)
const balance = await cofhejs.unseal(sealedBalance)
// balance is now a plain JavaScript value

// Unsealing multiple values from a structured response
const response = await myContract.getMultipleValues(permission)
const unsealed = await cofhejs.unseal(response)
// unsealed will maintain the same structure as response, but with decrypted values
```

### Integration with Popular Web3 Libraries

#### Using with ethers.js

```typescript
import { ethers } from "ethers";
import { cofhejs } from "cofhejs/web";
import MyContractABI from "./MyContract.json";

// Setup
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const contract = new ethers.Contract(contractAddress, MyContractABI, signer);

// Initialize cofhejs
await cofhejs.initialize({ provider, signer });
await cofhejs.createPermit();
const permission = cofhejs.getPermit().getPermission();

// Encrypt data and send transaction
const encryptedAmount = cofhejs.encrypt(Encryptable.uint64(1000));
const tx = await contract.deposit(permission, encryptedAmount);
await tx.wait();

// Retrieve and unseal data
const sealedBalance = await contract.getBalance(permission);
const balance = await cofhejs.unseal(sealedBalance);
console.log("Balance:", balance);
```

#### Using with viem

```typescript
import { createWalletClient, custom, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cofhejs } from "cofhejs/web";
import { fhenixNetwork } from "cofhejs/chains";
import MyContractABI from "./MyContract.json";

// Setup
const account = privateKeyToAccount("0x...");
const client = createWalletClient({
  account,
  chain: fhenixNetwork,
  transport: custom(window.ethereum)
});

const contract = getContract({
  address: contractAddress,
  abi: MyContractABI,
  client
});

// Initialize cofhejs
await cofhejs.initialize({ provider: client, signer: account });
await cofhejs.createPermit();
const permission = cofhejs.getPermit().getPermission();

// Encrypt and send transaction
const encryptedVote = cofhejs.encrypt(Encryptable.bool(true));
await contract.write.castVote([permission, encryptedVote]);

// Get and unseal results
const sealedResults = await contract.read.getResults([permission]);
const results = await cofhejs.unseal(sealedResults);
console.log("Voting results:", results);
```

### Advanced Usage: Working with Raw Permits

For applications requiring more fine-grained control:

```typescript
import { Permit } from "cofhejs/core";

// Create a permit manually
const permit = new Permit({
  provider,
  signer,
  chainId: 42069
});

// Generate a new permit
await permit.generate({
  type: "third-party",
  issuer: userAddress,
  delegatee: receiverAddress,
  expiration: 86400 // 24 hours
});

// Sign the permit
await permit.sign();

// Get permission for contract calls
const permission = permit.getPermission();

// Export permit for storage
const serialized = permit.serialize();
localStorage.setItem("savedPermit", serialized);

// Import previously saved permit
const savedPermit = localStorage.getItem("savedPermit");
if (savedPermit) {
  await permit.deserialize(savedPermit);
}
```

For more advanced use cases and detailed API documentation, please refer to our [full documentation](https://fhenixjs.fhenix.zone).
