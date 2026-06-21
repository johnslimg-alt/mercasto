const https = require('https');
const url = require('url');

const SSE_URL = 'https://mcp.mercasto.com/sse';

console.log(`Connecting to SSE endpoint: ${SSE_URL}...`);

const parsed = url.parse(SSE_URL);
const req = https.request({
  hostname: parsed.hostname,
  path: parsed.path,
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream'
  }
}, (res) => {
  let buffer = '';
  let postUrl = null;

  res.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      console.log('Raw line:', line);
      if (line.startsWith('event: endpoint')) {
        continue;
      }
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data.startsWith('http')) {
          postUrl = data;
          console.log(`📡 Obtained POST Endpoint: ${postUrl}`);
          
          // Step 1: Initialize the MCP server
          setTimeout(() => initializeMcp(postUrl), 500);
        } else {
          try {
            const json = JSON.parse(data);
            console.log('\n📥 Received MCP Message:', JSON.stringify(json, null, 2));
            
            // If tools list response
            if (json.id === 2 && json.result && json.result.tools) {
              const runTool = json.result.tools.find(t => t.name.includes('command') || t.name.includes('run') || t.name.includes('bash') || t.name.includes('execute'));
              if (runTool) {
                console.log(`\n👉 Executing command on VPS using tool: ${runTool.name}...`);
                callMcpTool(postUrl, runTool.name, {
                  // Wait, check the tool's expected schema (usually 'command')
                  command: 'whoami; hostname; pwd'
                });
              } else {
                console.log('No matching tool found to run bash commands in tools list:', json.result.tools);
              }
            }
          } catch (e) {
            // console.log(`Raw data line: ${data}`);
          }
        }
      }
    }
  });
});

req.on('error', (e) => {
  console.error('Connection error:', e);
});
req.end();

function postMcp(postUrl, payload) {
  const parsedPost = url.parse(postUrl);
  const body = JSON.stringify(payload);
  const postReq = https.request({
    hostname: parsedPost.hostname,
    path: parsedPost.path, // path already includes pathname + search
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    console.log(`📤 POST response status: ${res.statusCode}`);
    let respBody = '';
    res.on('data', chunk => respBody += chunk.toString());
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`Error response body: ${respBody}`);
      }
    });
  });
  
  postReq.on('error', (err) => {
    console.error('POST error:', err);
  });
  
  postReq.write(body);
  postReq.end();
}

function initializeMcp(postUrl) {
  console.log('Sending initialize request...');
  postMcp(postUrl, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  });

  // Wait 1 second and ask for tools/list
  setTimeout(() => {
    console.log('Listing tools...');
    postMcp(postUrl, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
  }, 1000);
}

function callMcpTool(postUrl, toolName, args) {
  postMcp(postUrl, {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  });
}
