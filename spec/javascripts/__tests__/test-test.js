import React from 'react/addons';
const TestUtils = React.addons.TestUtils;
jest.dontMock(componentPath('Test'));
const Test = require(componentPath('Test'));

describe('Test', () => {
  it('should tell you it is a test component', () => {
    let testComponent = TestUtils.renderIntoDocument(<Test/>);
    let testComponentNode = React.findDOMNode(testComponent);
    expect(testComponentNode.textContent).toBe('Something');
  });
});
