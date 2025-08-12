import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import ToggleButton from 'src/components/common/ToggleButton';

configure({ adapter: new Adapter() });

describe('React.createElement(ToggleButton, {})', () => {
  let wrapper;
  let onToggleSpy;
  let onChangeSpy;

  beforeEach(() => {
    onToggleSpy = sinon.spy();
    onChangeSpy = sinon.spy();

    wrapper = shallow(
      React.createElement(ToggleButton, {
        isToggledInitial: false,
        onToggle: onToggleSpy,
        onChange: onChangeSpy,
        onLabel: 'Conv.',
        offLabel: 'Yield',
        tooltipOn: 'Click to enable Default mode',
        tooltipOff: 'Click to enable Gas mode'
      })
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should render with the initial state', () => {
    expect(wrapper.find('span').text()).toEqual('Yield');
  });

  it('should toggle state and update label when clicked', () => {
    wrapper.find('Button').simulate('click');
    expect(wrapper.find('span').text()).toEqual('Conv.');
  });

  it('should call the onToggle and onChange callbacks when clicked', () => {
    wrapper.find('Button').simulate('click');
    expect(onToggleSpy.calledOnce).toBe(true);
    expect(onToggleSpy.calledWith(true)).toBe(true);
    expect(onChangeSpy.calledOnce).toBe(true);
    expect(onChangeSpy.calledWith(true)).toBe(true);
  });
});
