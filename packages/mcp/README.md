# sysketch-mcp

An [MCP](https://modelcontextprotocol.io) server that lets Claude, Cursor and other AI clients draw polished system design diagrams with [sysketch](https://www.npmjs.com/package/sysketch). The AI writes a ~40-token spec instead of thousands of tokens of SVG; the server renders the file and replies with one line.

![Diagram rendered by sysketch](https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/hero.png)

## Install

**Claude Code**

```bash
claude mcp add sysketch -- npx -y sysketch-mcp
```

**Claude Desktop, Cursor and other clients** (MCP config):

```json
{
  "mcpServers": {
    "sysketch": { "command": "npx", "args": ["-y", "sysketch-mcp"] }
  }
}
```

Requires Node 20+.

## Use

Ask: _"Use sysketch to diagram a ride-sharing system, as a PNG."_ The AI writes a short spec, the server writes the files into your project, and only a summary comes back:

```
wrote diagrams/ride-sharing.png (4564x984, 8 nodes, 10 edges, 259.8 KB); spec: diagrams/ride-sharing.yaml
```

The spec is saved next to the diagram, so follow-up edits ("add a notification service") are one-line changes.

Measured with Claude Code on the same request: **846 output tokens** with sysketch vs **10,538** when the AI writes the SVG itself.

## Tools

| Tool             | What it does                                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `render_diagram` | Renders a spec (`spec` text or `file` path) to `.svg` or `.png` (`out`), with an optional `theme`. `preview: true` also returns the image for the AI to look at (costs extra tokens, off by default). |
| `list_icons`     | Lists the 61 icons and their aliases.                                                                                                                                                                 |

The tool definitions add about 360 tokens per session.

Spec format, themes and examples: **[github.com/Tonys-Coding/sysketch](https://github.com/Tonys-Coding/sysketch)**

License: MIT
