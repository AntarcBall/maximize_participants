const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const distDir = path.join(projectRoot, 'dist');

function escapeHtmlAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildRuntimeBundle() {
  const coreSource = fs.readFileSync(path.join(srcDir, 'core.js'), 'utf8');
  const bookmarkletSource = fs.readFileSync(path.join(srcDir, 'bookmarklet.js'), 'utf8');
  return `${coreSource}\n${bookmarkletSource}\nwindow.When2MeetMultiSessionBookmarklet.run();\n`;
}

async function minifyJavaScript(source) {
  const { minify } = require('/usr/share/nodejs/terser');
  const result = await minify(source, {
    compress: true,
    mangle: true,
    ecma: 2020,
  });
  if (!result || !result.code) {
    throw new Error('Terser did not return minified code');
  }
  return result.code;
}

function toBase64Utf8(source) {
  return Buffer.from(source, 'utf8').toString('base64');
}

function buildBookmarkletPayload(minifiedBundle) {
  const base64 = JSON.stringify(toBase64Utf8(minifiedBundle));
  return `javascript:(()=>{const b=${base64},u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));(0,eval)(new TextDecoder().decode(u))})()`;
}

function writeInstallHelpers(bookmarklet) {
  const importHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n  <DT><A HREF="${escapeHtmlAttribute(bookmarklet)}">When2Meet Analyzer</A>\n</DL><p>\n`;
  const installHtml = `<!doctype html><meta charset="utf-8"><title>Install bookmarklet</title><p>Drag this link to your Chrome bookmarks bar:</p><p><a href="${escapeHtmlAttribute(bookmarklet)}">When2Meet Analyzer</a></p>`;

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'chrome-bookmark-import.html'), importHtml, 'utf8');
  fs.writeFileSync(path.join(distDir, 'install.html'), installHtml, 'utf8');
}

async function main() {
  const runtimeBundle = buildRuntimeBundle();
  const minifiedBundle = await minifyJavaScript(runtimeBundle);
  const bookmarklet = buildBookmarkletPayload(minifiedBundle);

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'bookmarklet.min.js'), minifiedBundle, 'utf8');
  fs.writeFileSync(path.join(distDir, 'bookmarklet.txt'), bookmarklet, 'utf8');
  writeInstallHelpers(bookmarklet);

  console.log(`Built ${path.relative(projectRoot, path.join(distDir, 'bookmarklet.min.js'))}`);
  console.log(`Built ${path.relative(projectRoot, path.join(distDir, 'bookmarklet.txt'))}`);
  console.log(`Built ${path.relative(projectRoot, path.join(distDir, 'chrome-bookmark-import.html'))}`);
  console.log(`Built ${path.relative(projectRoot, path.join(distDir, 'install.html'))}`);
  console.log(`Runtime characters: ${runtimeBundle.length}`);
  console.log(`Minified runtime characters: ${minifiedBundle.length}`);
  console.log(`Bookmarklet characters: ${bookmarklet.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
