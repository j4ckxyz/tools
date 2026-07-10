# Instructions for AI Agents

Welcome! This repository contains a collection of one-off, self-contained HTML/JS tools hosted on [tools.j4ck.xyz](https://tools.j4ck.xyz).
To keep the codebase consistent, clean, and maintainable, all agents must strictly adhere to the following rules when creating or modifying tools.

## Core Rules

1. **No React or Frameworks**: Never use React, Vue, Svelte, or similar frameworks. All tools must be plain HTML, vanilla CSS, and vanilla JavaScript.
2. **Self-Contained Files**: Each tool must be a single, self-contained `.html` file at the root of the repository (except for linking to the shared `common.css` and Bootstrap/Icon CDNs).
3. **Shared Styles & Theme**:
   - Every tool must link to the shared stylesheet: `<link rel="stylesheet" href="common.css">`.
   - The shared stylesheet handles typography, layout utilities, forms, and **automatic light/dark mode** (`@media (prefers-color-scheme: dark)`).
   - Use Bootstrap 5.3 CSS via CDN for responsive grids and complex utility classes where helpful.
   - Use Bootstrap Icons via CDN for icons.
4. **Desktop & Mobile Responsive**: Every tool must be fully accessible and optimized for both desktop and mobile viewports.

---

## Code Formatting Standards

### CSS / Styling
- All CSS must be indented with **two spaces**.
- Any tool-specific custom styles inside a `<style>` block must start exactly like this:
  ```html
  <style>
  * {
    box-sizing: border-box;
  }
  /* tool-specific overrides here */
  </style>
  ```
- **Typography**: Form inputs (`input`, `select`, `button`) and text areas (`textarea`) must have a font size of exactly **16px** (to prevent iOS Safari auto-zoom issues). The font family must always prefer **Helvetica** (e.g. `font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;`).

### JavaScript
- All JavaScript must use **two-space indents**.
- All script blocks must be ES modules and start exactly like this:
  ```html
  <script type="module">
  // code in here should not be indented at the first level
  const myVariable = 'value';
  
  function initialize() {
    // nested code is indented
  }
  </script>
  ```

---

## Adding a New Tool

When creating a new tool (e.g., `my-new-tool.html`):
1. Save the file in the root directory.
2. Link the common stylesheet (`common.css`), Bootstrap (if needed), and Bootstrap Icons.
3. Update the inline tools database inside `index.html` by adding your new tool's metadata to the `TOOLS` array:
   ```javascript
   {
     name: "My New Tool",
     path: "my-new-tool.html",
     description: "A short, descriptive summary of what the tool does.",
     tags: ["dev", "encoder", "text"],
     icon: "bi-gear" // Bootstrap Icon class name
   }
   ```
4. Test that the tool works locally, works in both dark and light modes, and looks visually polished.
