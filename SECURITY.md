# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub's **[private vulnerability reporting](https://github.com/Tonys-Coding/sysketch/security/advisories/new)** rather than in a public issue. Include the version, what you found and, if possible, a small spec or steps to reproduce. You'll get a reply as soon as possible, and a fix will be released and credited once it's ready.

Security fixes are made in the latest released version.

## What sysketch does with your files

- **The renderer** (`sysketch`) reads only the spec it's given, its bundled fonts, and logos you installed or pointed it to. It never sends data anywhere. The only network request is `sysketch logos install simple-icons`, which downloads from `registry.npmjs.org` over HTTPS and checks the package's sha512 integrity hash.
- **The MCP server** (`sysketch-mcp`) follows instructions from an AI model, so it is restricted to the project folder it runs in: it only reads spec files (`.yaml`, `.yml`, `.json`) and only writes diagrams (`.svg`, `.png`) inside that folder, never overwrites YAML files that aren't sysketch specs, and only uses logo folders inside the project.
- **Diagrams** contain no scripts. Text is drawn as shapes and logos are embedded as images, so opening an SVG from someone else is as safe as opening a picture.
