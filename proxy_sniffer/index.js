const WebSocket = require('ws');

// WebSocket server on port 8001
const wss8001 = new WebSocket.Server({ port: 8001 });

wss8001.on('error', ()=>{})
wss8001.on('connection', function connection(ws) {
    console.log('Client connected to port 8001');

    // Create a new WebSocket connection to the server on port 8002
    const ws8002 = new WebSocket('ws://localhost:8002');
    ws8002.on('error', ()=>{})

    // Forward messages from client (8001) to server (8002)
    ws.on('message', function incoming(message) {
        console.log(message.toString());
        if (ws8002.readyState === WebSocket.OPEN) {
            ws8002.send(message);
        } else {
            console.log('Unable to forward message; 8002 connection not ready');
        }
    });

    // Forward messages from server (8002) back to the client (8001)
    ws8002.on('message', function incoming(message) {
        console.log('Received message from 8002:', message.toString());
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            console.log('Forwarded message back to client on 8001');
        } else {
            console.log('Unable to forward message to client; connection not ready');
        }
    });

    // Handle errors for both connections
    ws.on('error', ()=>{})
    ws8002.on('error', ()=>{})

    // Close both connections when one side closes
    ws.on('close', function close() {
        console.log('Client disconnected from 8001');
        ws8002.close();
    });
    ws8002.on('close', function close() {
        console.log('Connection to 8002 closed');
        ws.close(); // Note: Closing the client connection might not be necessary if it's already closed
    });
});

console.log('WebSocket server on port 8001 is running and forwarding to 8002');