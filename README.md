# ws-p2p-comm-rsa

Websocket per-to-per communication secured with rsa 

## Usage

```sh
# Build
npm run build

# Run
node dist/index.js  --target <host:port> --port <port> --codeword <codeword>

# Portable Example
npx ts-node src/index.ts --target localhost:8001 --port 8002 --codeword brownFox
```