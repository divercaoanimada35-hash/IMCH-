/**
 * Utility to bundle multiple files (index.html, styles.css, app.js, etc.)
 * into a single self-contained HTML document ready for <iframe srcdoc>.
 */
export function bundleFilesForIframe(files: Record<string, string>): string {
  if (!files || Object.keys(files).length === 0) {
    return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #09090b;
      color: #71717a;
      text-align: center;
      padding: 24px;
    }
  </style>
</head>
<body>
  <div>
    <h3>Nenhum arquivo gerado ainda</h3>
    <p>Escreva o briefing do website e clique em "Gerar" para iniciar.</p>
  </div>
</body>
</html>`;
  }

  // Find index.html or first .html file
  const htmlFileKey = Object.keys(files).find((f) => f.endsWith('.html') || f === 'index.html') || Object.keys(files)[0];
  let htmlContent = files[htmlFileKey] || '';

  // Collect all CSS files
  const cssFiles = Object.entries(files).filter(([path]) => path.endsWith('.css'));
  const bundledCss = cssFiles.map(([, content]) => content).join('\n\n');

  // Collect all JS files
  const jsFiles = Object.entries(files).filter(([path]) => path.endsWith('.js') && !path.endsWith('.json'));
  const bundledJs = jsFiles.map(([, content]) => content).join('\n\n');

  // If htmlContent doesn't look like valid HTML, wrap it
  if (!htmlContent.includes('<html') && !htmlContent.includes('<!DOCTYPE')) {
    htmlContent = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
  }

  // Remove existing external links to styles.css or script.js if we will inline them
  cssFiles.forEach(([cssPath]) => {
    const filename = cssPath.split('/').pop() || cssPath;
    const linkRegex = new RegExp(`<link[^>]*href=["'][^"']*${filename}["'][^>]*>`, 'gi');
    htmlContent = htmlContent.replace(linkRegex, '');
  });

  jsFiles.forEach(([jsPath]) => {
    const filename = jsPath.split('/').pop() || jsPath;
    const scriptRegex = new RegExp(`<script[^>]*src=["'][^"']*${filename}["'][^>]*>\\s*<\\/script>`, 'gi');
    htmlContent = htmlContent.replace(scriptRegex, '');
  });

  // Inject bundled CSS before </head> or at beginning
  if (bundledCss.trim().length > 0) {
    const styleTag = `<style data-injected-styles="imch-ai">\n${bundledCss}\n</style>`;
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${styleTag}\n</head>`);
    } else if (htmlContent.includes('<body')) {
      htmlContent = htmlContent.replace('<body', `${styleTag}\n<body`);
    } else {
      htmlContent = `${styleTag}\n${htmlContent}`;
    }
  }

  // Inject navigation interception helper and bundled JS before </body>
  const helperScript = `
<script data-injected-helpers="imch-ai">
  // Prevent iframe from opening external window popups and handle anchor scrolls
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElem = document.getElementById(targetId);
        if (targetElem) {
          targetElem.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  });
</script>
`;

  let jsInjection = '';
  if (bundledJs.trim().length > 0) {
    jsInjection = `${helperScript}\n<script data-injected-scripts="imch-ai">\n${bundledJs}\n</script>`;
  } else {
    jsInjection = helperScript;
  }

  if (htmlContent.includes('</body>')) {
    htmlContent = htmlContent.replace('</body>', `${jsInjection}\n</body>`);
  } else {
    htmlContent = `${htmlContent}\n${jsInjection}`;
  }

  return htmlContent;
}
