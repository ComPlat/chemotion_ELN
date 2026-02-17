import React from 'react';
import { configure, shallow, mount } from 'enzyme';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import TextAreaCellEditor from '../../../../../../../../app/javascript/src/apps/mydb/collections/TextAreaCellEditor';

configure({ adapter: new Adapter() });

describe('TextAreaCellEditor Component', () => {
  let wrapper;
  const props = {
    value: 'Initial text',
    onValueChange: sinon.spy(),
  };

  beforeEach(() => {
    props.onValueChange.resetHistory();
    wrapper = shallow(
      React.createElement(TextAreaCellEditor, {
        value: props.value,
        onValueChange: props.onValueChange,
      })
    );
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('should render without crashing', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('should initialize with the correct value', () => {
    expect(wrapper.find('textarea').prop('value')).toBe(props.value);
  });

  it('should update state on textarea change', () => {
    const newValue = 'Updated text';
    wrapper.find('textarea').simulate('change', { target: { value: newValue } });
    expect(wrapper.find('textarea').prop('value')).toBe(newValue);
  });

  it('should call onValueChange when the value changes', () => {
    const newValue = 'New text';
    wrapper.find('textarea').simulate('change', { target: { value: newValue } });
    expect(props.onValueChange.calledOnce).toBe(true);
    expect(props.onValueChange.calledWith(newValue)).toBe(true);
  });

  it('should handle save button click', () => {
    const newValue = 'Saved text';
    wrapper.find('textarea').simulate('change', { target: { value: newValue } });
    props.onValueChange.resetHistory();
    wrapper.find('button.btn-success').simulate('click');
    expect(props.onValueChange.calledOnce).toBe(true);
    expect(props.onValueChange.calledWith(newValue)).toBe(true);
  });

  it('should handle cancel button click', () => {
    const newValue = 'Canceled text';
    wrapper.find('textarea').simulate('change', { target: { value: newValue } });
    wrapper.find('button.btn-light').simulate('click');
    expect(wrapper.find('textarea').prop('value')).toBe(props.value);
  });

  it('should handle paste events correctly', () => {
    const pastedText = 'Pasted text';
    const event = { clipboardData: { getData: () => pastedText }, preventDefault: sinon.spy() };
    wrapper.find('textarea').simulate('paste', event);
    expect(wrapper.find('textarea').prop('value')).toBe(pastedText);
    expect(event.preventDefault.called).toBe(true);
  });

  // --- Tests that require full rendering for refs ---
  it('should expose getValue via ref', () => {
    const ref = React.createRef();
    const mountedWrapper = mount(
      React.createElement(TextAreaCellEditor, {
        ref,
        value: 'Test value'
      })
    );
    expect(ref.current.getValue()).toBe('Test value');
    mountedWrapper.unmount();
  });

  it('should focus and select the textarea when afterGuiAttached is called', () => {
    const ref = React.createRef();
    const mountedWrapper = mount(
      React.createElement(TextAreaCellEditor, {
        ref,
        value: 'Focus test'
      })
    );
    const textarea = mountedWrapper.find('textarea').getDOMNode();
    sinon.spy(textarea, 'focus');
    sinon.spy(textarea, 'select');

    ref.current.afterGuiAttached();
    expect(textarea.focus.calledOnce).toBe(true);
    expect(textarea.select.calledOnce).toBe(true);

    textarea.focus.restore();
    textarea.select.restore();
    mountedWrapper.unmount();
  });

  it('should return true from isPopup', () => {
    const ref = React.createRef();
    const mountedWrapper = mount(
      React.createElement(TextAreaCellEditor, { ref })
    );
    expect(ref.current.isPopup()).toBe(true);
    mountedWrapper.unmount();
  });

  it('should return false from isCancelBeforeStart', () => {
    const ref = React.createRef();
    const mountedWrapper = mount(
      React.createElement(TextAreaCellEditor, { ref })
    );
    expect(ref.current.isCancelBeforeStart()).toBe(false);
    mountedWrapper.unmount();
  });

  it('should return true from valueChanged', () => {
    const ref = React.createRef();
    const mountedWrapper = mount(
      React.createElement(TextAreaCellEditor, { ref })
    );
    expect(ref.current.valueChanged()).toBe(true);
    mountedWrapper.unmount();
  });

  it('should not throw if onValueChange or api are not provided (save)', () => {
    const mountedWrapper = mount(
      React.createElement(TextAreaCellEditor, { value: 'Safe text' })
    );
    mountedWrapper.find('button.btn-success').simulate('click');
    expect(mountedWrapper.exists()).toBe(true);
    mountedWrapper.unmount();
  });

  it('should not throw if api is not provided (cancel)', () => {
    const mountedWrapper = mount(
      React.createElement(TextAreaCellEditor, { value: 'Safe text' })
    );
    mountedWrapper.find('button.btn-light').simulate('click');
    expect(mountedWrapper.exists()).toBe(true);
    mountedWrapper.unmount();
  });
});
