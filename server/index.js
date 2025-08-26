const express = require("express");
const app = express();
const cors = require("cors");
const port = 3042;
const secp = require("ethereum-cryptography/secp256k1");
const { toHex } = require("ethereum-cryptography/utils");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { utf8ToBytes } = require("ethereum-cryptography/utils");

app.use(cors());
app.use(express.json());

const publicKeys = [];

const publicKeyToEthAddress = (publicKey) => {
  // Ethereum address is the last 20 bytes of the Keccak-256 hash of the public key
  const hash = require("ethereum-cryptography/keccak").keccak256;
  const ethAddress = hash(publicKey.slice(1)).slice(-20);
  return "0x" + toHex(ethAddress);
}

const getEthAddressFromPrivateKey = (privateKey) => {
  const publicKey = secp.getPublicKey(privateKey);
  return publicKeyToEthAddress(publicKey);
}

// generate private keys
for (let i = 0; i < 4; i++) {
  const privateKey = secp.utils.randomPrivateKey();
  publicKeys.push(secp.getPublicKey(privateKey));
  console.log(`Account ${i + 1}:\nPrivate Key: ${toHex(privateKey)}\nEthereum Address: ${publicKeyToEthAddress(secp.getPublicKey(privateKey))}\n`);
}


//predefined balances for three accounts

const balances = {
  [publicKeyToEthAddress(publicKeys[0])]: 100,
  [publicKeyToEthAddress(publicKeys[1])]: 50,
  [publicKeyToEthAddress(publicKeys[2])]: 75,
}

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", (req, res) => {
  const { signature, recovery, message } = req.body;

  try {
    // Create message hash for signature verification
    const messageHash = keccak256(utf8ToBytes(message));
    
    // Recover public key from signature
    const publicKey = secp.recoverPublicKey(messageHash, signature, recovery);
    const senderAddress = publicKeyToEthAddress(publicKey);

    // Parse transaction details from message
    const { recipient, amount } = JSON.parse(message);

    setInitialBalance(senderAddress);
    setInitialBalance(recipient);

    if (balances[senderAddress] < amount) {
      res.status(400).send({ message: "Not enough funds!" });
    } else {
      balances[senderAddress] -= amount;
      balances[recipient] += amount;
      res.send({ balance: balances[senderAddress] });
    }
  } catch (error) {
    res.status(400).send({ message: "Invalid signature or transaction!" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}
