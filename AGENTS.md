# Instructions for AI Agents

Welcome! This repository contains a collection of one-off, self-contained HTML/JS tools hosted statically on Cloudflare Pages.
To keep the codebase consistent, clean, and maintainable, all agents must strictly adhere to the following rules when creating or modifying tools.

## Core Rules

1. **No React or Frameworks**: Never use React, Vue, Svelte, or similar frameworks. All tools must be plain HTML, vanilla CSS, and vanilla JavaScript.
2. **Self-Contained Files**: Each tool must be a single, self-contained `.html` file at the root of the repository (except for linking to the shared `common.css` and Bootstrap/Icon CDNs).
3. **Shared Styles, Theme & Persistence**:
   - Every tool must link to the shared stylesheet: `<link rel="stylesheet" href="common.css">`.
   - Every tool must support manual light/dark mode override. In the `<head>`, include this inline script to prevent theme flash:
     ```html
     <script>
       const savedTheme = localStorage.getItem('theme') || 'auto';
       if (savedTheme === 'dark') {
         document.documentElement.classList.add('theme-dark');
       } else if (savedTheme === 'light') {
         document.documentElement.classList.add('theme-light');
       }
     </script>
     ```
   - In the header of every tool, include a theme toggle button:
     ```html
     <button id="theme-toggle" class="btn-custom btn-custom-secondary py-1 px-2 fs-7" title="Switch Theme">
       <i id="theme-toggle-icon" class="bi bi-circle-half"></i>
     </button>
     ```
     Hook this button up in your module script to toggle and save the theme to `localStorage`.
   - Use Bootstrap 5.3 CSS via CDN for responsive grids and complex utility classes where helpful.
   - Use Bootstrap Icons via CDN for icons.
4. **Desktop & Mobile Responsive**: Every tool must be fully accessible and optimized for both desktop and mobile viewports.
5. **Open Graph & SEO**: Every tool must include standard SEO tags and reference the shared Open Graph image card `og-image.jpg`:
   ```html
   <meta property="og:title" content="Tool Title — Browser Tools">
   <meta property="og:description" content="A short, descriptive summary of what the tool does.">
   <meta property="og:image" content="https://tools.j4ck.xyz/og-image.jpg">
   <meta property="og:type" content="website">
   <meta name="twitter:card" content="summary_large_image">
   <meta name="twitter:image" content="https://tools.j4ck.xyz/og-image.jpg">
   ```

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
2. Link `common.css`, Bootstrap, and Bootstrap Icons, and include the theme-flash-prevention script.
3. Update the inline tools database inside `index.html` by adding your new tool's metadata to the `TOOLS` array, including the creation date in `YYYY-MM-DD` format:
   ```javascript
   {
     name: "My New Tool",
     path: "my-new-tool.html",
     description: "A short, descriptive summary of what the tool does.",
     created: "2026-07-10",
     icon: "bi-gear" // Bootstrap Icon class name
   }
   ```
4. Increment local visits on click to let the local popularity sorting works.
5. Test that the tool works locally in both dark and light modes, and looks visually polished.

