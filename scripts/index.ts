import crypto from 'crypto'
import fs from 'fs'

const generateAccessKeyPair = () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      })
    fs.writeFileSync(__dirname + "/AccessTokenPublicKey.pem",publicKey)
    fs.writeFileSync(
      __dirname + "/AccessTokenPrivateKey.pem",
      privateKey
    )
}

generateAccessKeyPair()

