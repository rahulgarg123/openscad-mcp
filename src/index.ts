#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const OPENSCAD_BINARY = process.env.OPENSCAD_BINARY || '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD';

interface OpenSCADResult {
  stdout: string;
  stderr: string;
  success: boolean;
  error?: string;
}

class OpenSCADMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'openscad-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'render_openscad',
            description: 'Render OpenSCAD code to PNG using OpenSCAD in headless mode',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'The OpenSCAD code to render',
                },
                output_path: {
                  type: 'string',
                  description: 'Path where the rendered PNG image should be saved',
                },
                camera: {
                  type: 'string',
                  description: 'Camera parameters: translate_x,y,z,rot_x,y,z,dist or eye_x,y,z,center_x,y,z',
                },
              },
              required: ['code', 'output_path'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'render_openscad') {
        return await this.handleRenderOpenSCAD(request.params.arguments || {});
      }
      
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private async handleRenderOpenSCAD(args: any): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    try {
      const { code, output_path, camera } = args;

      if (!code || typeof code !== 'string') {
        throw new Error('OpenSCAD code is required and must be a string');
      }

      if (!output_path || typeof output_path !== 'string') {
        throw new Error('Output path is required and must be a string');
      }

      const result = await this.renderOpenSCAD(code, output_path, camera);

      // Return text response with file path information
      let responseText = `OpenSCAD rendering ${result.success ? 'completed successfully' : 'failed'}\n\nOutput:\n${result.stdout}${result.stderr ? '\n\nErrors/Warnings:\n' + result.stderr : ''}`;

      if (result.success) {
        responseText += `\n\nRendered image saved to: ${output_path}`;
      }

      if (result.error) {
        responseText += `\n\nError: ${result.error}`;
      }

      return {
        content: [{
          type: 'text',
          text: responseText
        }]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error rendering OpenSCAD: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async renderOpenSCAD(code: string, outputPath: string, camera?: string): Promise<OpenSCADResult> {
    const tempDir = tmpdir();
    const timestamp = Date.now();
    const inputFile = join(tempDir, `openscad_input_${timestamp}.scad`);

    try {
      // Write OpenSCAD code to temporary file
      await fs.writeFile(inputFile, code, 'utf8');

      // Build command arguments: input file, --render flag, output file
      const args = [inputFile, '--render', '--autocenter', '--viewall','--imgsize=640,480','--backend=manifold', '-o', outputPath];

      // Add camera parameters if provided
      if (camera) {
        args.push('--camera', camera);
      }

      // Execute OpenSCAD with 10 minute timeout
      const { stdout, stderr } = await execFileAsync(OPENSCAD_BINARY, args, {
        timeout: 600000, // 10 minutes
      });

      // Check if output file was created successfully
      const outputExists = await fs.access(outputPath).then(() => true).catch(() => false);

      // Clean up temporary input file only
      await this.cleanupFiles([inputFile]);

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        success: outputExists,
      };

    } catch (error) {
      // Clean up temporary input file even on error
      await this.cleanupFiles([inputFile]);

      return {
        stdout: '',
        stderr: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async cleanupFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore cleanup errors - files may not exist
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenSCAD MCP Server running on stdio');
  }
}

// Start the server
const server = new OpenSCADMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
