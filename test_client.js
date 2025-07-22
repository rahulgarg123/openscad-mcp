#!/usr/bin/env node

import { spawn } from 'child_process';

// Test the MCP server
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Send list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list'
};

serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

// Send render request
const renderRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'render_openscad',
    arguments: {
      code: `// Define a cube
cube([20, 30, 10]);

// Define a sphere
sphere(r=5);

// Translate the sphere
translate([5, 10, 2]) sphere(r=5);`,
      output_path: 'test_output.png'
    }
  }
};

setTimeout(() => {
  serverProcess.stdin.write(JSON.stringify(renderRequest) + '\n');
}, 100);

// Handle responses
serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      console.log('Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Raw output:', line);
    }
  }
});

// Cleanup after 5 seconds
setTimeout(() => {
  serverProcess.kill();
  process.exit(0);
}, 5000);