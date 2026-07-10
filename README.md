# Browser Tools (tools.j4ck.xyz)

A collection of miscellaneous, self-contained HTML + CSS + JavaScript tools built with the help of LLM agents. Runs entirely in the browser, hosted statically on Cloudflare Pages.

Inspired by [simonw/tools](https://github.com/simonw/tools).

## Repository Guidelines

To maintain a consistent aesthetic, shared design system, and clean codebase, all future modifications or additions must follow the standards outlined in [AGENTS.md](file:///Users/jack/code/tools/AGENTS.md).

### Core Standards Quick Reference:
- **No frameworks**: Plain HTML, vanilla JavaScript, vanilla CSS.
- **Common CSS**: Every tool links to [common.css](file:///Users/jack/code/tools/common.css).
- **Responsive**: Auto-adjusts for mobile and desktop screens.
- **Auto Light/Dark**: Automatically adapts to system dark/light mode preferences.
- **Consistent Fonts**: Prefers Helvetica. Form inputs/textareas are sized at exactly `16px`.
- **Searchable Home Page**: Every tool is indexed on the home page [index.html](file:///Users/jack/code/tools/index.html).

---

## Developer Instructions

### Adding a new tool:
1. Create a new HTML file in the root directory (e.g. `example-tool.html`).
2. Add your HTML structure, linking to `common.css` and Bootstrap (if needed).
3. Inside your `<script type="module">` block, do not indent code at the first level.
4. Add the tool to the `TOOLS` list inside `index.html`.

### Hosting:
This repository is configured for static hosting on Cloudflare Pages. Simply push to `main` to deploy.
