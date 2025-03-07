require('module-alias/register');
require('@babel/register')();
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
