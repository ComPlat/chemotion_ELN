import React from 'react';
import { shallow } from 'enzyme';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import ToggleButton from 'src/components/common/ToggleButton';

describe('<ToggleButton />', () => {
  let wrapper;
  let onToggleSpy;
  let onChangeSpy;

  beforeEach(() => {
    onToggleSpy = sinon.spy();
    onChangeSpy = sinon.spy();

    wrapper = shallow(
      <ToggleButton
        isToggledInitial={false}
        onToggle={onToggleSpy}
        onChange={onChangeSpy}
        onLabel="Gas Scheme"
        offLabel="Default Scheme"
        onColor="#afcfee"
        offColor="#d3d3d3"
        tooltipOn="Click to enable Default mode"
        tooltipOff="Click to enable Gas mode"
        fontSize="1em"
        fontWeight="normal"
      />
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should render with the initial state', () => {
    expect(wrapper.find('span').text()).toEqual('Default Scheme');
  });

  it('should toggle state and update label when clicked', () => {
    wrapper.find('Button').simulate('click');
    expect(wrapper.find('span').text()).toEqual('Gas Scheme');
  });

  it('should call the onToggle and onChange callbacks when clicked', () => {
    wrapper.find('Button').simulate('click');
    expect(onToggleSpy.calledOnce).toBe(true);
    expect(onToggleSpy.calledWith(true)).toBe(true);
    expect(onChangeSpy.calledOnce).toBe(true);
    expect(onChangeSpy.calledWith(true)).toBe(true);
  });

  it('should apply the correct background color based on the state', () => {
    const buttonStyleBefore = wrapper.find('Button').prop('style');
    expect(buttonStyleBefore.backgroundColor).toEqual('#d3d3d3');

    wrapper.find('Button').simulate('click');

    const buttonStyleAfter = wrapper.find('Button').prop('style');
    expect(buttonStyleAfter.backgroundColor).toEqual('#afcfee');
  });
});
