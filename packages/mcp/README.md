# sysketch-mcp

<img alt="sysketch: your system, sketched" src="https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/brand/sysketch-logo.png" width="360">

Lets Claude, Cursor and other AI assistants draw clean, hand-sketched system design diagrams with [sysketch](https://www.npmjs.com/package/sysketch). The assistant writes a short description of your system instead of drawing the image itself, which makes diagrams faster, cheaper and consistent.

![A diagram drawn by sysketch](https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/hero.png)

## Setup

You need [Node.js](https://nodejs.org) 20 or newer.

**Claude Code:** run once in your terminal:

```bash
claude mcp add sysketch -- npx -y sysketch-mcp
```

**Claude Desktop, Cursor and other assistants:** add this to the assistant's MCP settings, then restart it:

```json
{
  "mcpServers": {
    "sysketch": { "command": "npx", "args": ["-y", "sysketch-mcp"] }
  }
}
```

## Use

Ask your assistant, for example:

> Use sysketch to draw a ride-sharing system as a PNG.

The diagram is saved in your project (in `diagrams/`) together with its description, so you can ask for changes later: "add a notification service", "use the blueprint theme". Only a one-line summary comes back into the conversation, never the image data.

Measured with Claude Code (Sonnet) on 5 system design requests: **4,352 output tokens** with sysketch vs **77,518** when the assistant drew the SVG itself, about 18x fewer ([benchmark](https://github.com/Tonys-Coding/sysketch/blob/main/docs/benchmark.md)).

## Tools

| Tool             | What it does                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `render_diagram` | Draws a diagram from a description (`spec`) or a file (`file`) to `.svg` or `.png`, with an optional `theme`. `preview: true` returns the image to the assistant (off by default). |
| `list_icons`     | Lists the icons and recognized names; `logos` searches installed official logos.                                                                                                   |

The tool definitions add about 450 tokens to each session.

## Official logos (optional)

When official logos are installed, product names like `s3` or `stripe` show the real logo. See the [logos guide](https://github.com/Tonys-Coding/sysketch/blob/main/docs/logos.md).

More examples, themes and the full spec: **[github.com/Tonys-Coding/sysketch](https://github.com/Tonys-Coding/sysketch)**

MIT License.
