/* global describe, it */

import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { Select, CreatableSelect } from 'src/components/common/Select';

configure({ adapter: new Adapter() });

describe('Select.js styles.input override', () => {
  it('forces the input container visible for a disabled isInputEditable select', () => {
    // react-select's own inputCSS sets `visibility: isDisabled ? 'hidden' : 'visible'`
    // on this container regardless of the isHidden prop; without this override a
    // disabled isInputEditable select (used to keep the current value editable
    // inline, e.g. the molecule-name dropdown) renders with no visible text at all.
    const wrapper = shallow(<CreatableSelect isInputEditable options={[]} />);
    const { styles } = wrapper.props();
    const style = styles.input({ visibility: 'hidden' }, { isDisabled: true });
    expect(style.visibility).toBe('visible');
  });

  it('still forces the input visible when the select happens to be enabled', () => {
    const wrapper = shallow(<CreatableSelect isInputEditable options={[]} />);
    const { styles } = wrapper.props();
    const style = styles.input({ visibility: 'visible' }, { isDisabled: false });
    expect(style.visibility).toBe('visible');
  });

  it('does not add an input style override for a plain (non-isInputEditable) select', () => {
    const wrapper = shallow(<Select options={[]} />);
    expect(wrapper.props().styles.input).toBeUndefined();
  });
});
