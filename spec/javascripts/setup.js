// Redirect cheerio/lib/utils → cheerio/utils for enzyme compatibility with cheerio 1.2.x
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function cheerioShim(request, parent, isMain, options) {
  if (request === 'cheerio/lib/utils') {
    return originalResolveFilename.call(this, 'cheerio/utils', parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Pass the babel config explicitly because spec/package.json creates a package boundary
// that prevents babel from discovering the root package.json's babel config. Without this,
// babel returns null for spec files and import statements are not transformed to require(),
// causing Node.js 22 to detect spec files as ESM and throw ERR_REQUIRE_CYCLE_MODULE.
require('@babel/register')({
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    '@babel/preset-react',
  ],
  plugins: [
    '@babel/plugin-transform-arrow-functions',
    '@babel/plugin-transform-async-to-generator',
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-classes',
    '@babel/plugin-transform-private-methods',
  ],
});
require('jsdom-global')();

const jsdom = require('jsdom');

const { JSDOM } = jsdom;

const { document } = (new JSDOM('', { url: 'http://localhost' })).window;
global.document = document;

const exposedProperties = ['window', 'navigator', 'document'];
global.window = document.defaultView;
Object.keys(document.defaultView).forEach((property) => {
  if (typeof global[property] === 'undefined') {
    exposedProperties.push(property);
    global[property] = document.defaultView[property];
  }
});

// Polyfill for requestAnimationFrame
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function requestAnimationFramePolyfill(callback) {
    return setTimeout(callback, 0);
  };
}

// Polyfill for cancelAnimationFrame
if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function cancelAnimationFramePolyfill(id) {
    clearTimeout(id);
  };
}

Object.defineProperty(global, 'navigator', {
  value: { userAgent: 'node.js' },
  writable: false,
});

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
// Return file.preview when set (react-dropzone pattern) so test assertions stay deterministic.
global.URL.createObjectURL = (file) => (file && file.preview) || 'blob:mock-url';
global.URL.revokeObjectURL = () => {};
