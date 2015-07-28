// see also https://github.com/facebook/jest/blob/master/examples/react-es6/__tests__/CheckboxWithLabel-test.js
// for an example
jest.dontMock('../test');

import React from 'react/addons';
const Test = require('../test');
var TestUtils = React.addons.TestUtils;

describe('Test', () => {
  it('should tell you it is a test component', () => {
    var testComponent = TestUtils.renderIntoDocument(<Test/>);
    var testComponentNode = React.findDOMNode(testComponent);
    expect(testComponentNode.textContent).toBe('Something');
  });
});
