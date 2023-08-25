require('@babel/register')();

var jsdom = require('jsdom');
const { JSDOM } = jsdom;

const { document } = (new JSDOM('', { url: 'http://localhost' })).window;
global.document = document;

var exposedProperties = ['window', 'navigator', 'document'];
global.window = document.defaultView;
Object.keys(document.defaultView).forEach((property) => {
  if (typeof global[property] === 'undefined') {
    exposedProperties.push(property);
    global[property] = document.defaultView[property];
  }
});

global.navigator = {
  userAgent: 'node.js'
};
