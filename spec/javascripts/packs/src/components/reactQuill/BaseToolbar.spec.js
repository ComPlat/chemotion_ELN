import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import BaseToolbar from 'src/components/reactQuill/BaseToolbar';

configure({ adapter: new Adapter() });

const render = (props = {}) => shallow(React.createElement(BaseToolbar, props));

describe('BaseToolbar', () => {
  describe('indent buttons', () => {
    it('offers both indent buttons when the editor allows indenting', () => {
      const wrapper = render({ indent: true });
      expect(wrapper.find('button.ql-indent').length).toBe(2);
    });

    it('leaves the indent buttons out by default', () => {
      const wrapper = render();
      expect(wrapper.find('button.ql-indent').length).toBe(0);
    });
  });
});
