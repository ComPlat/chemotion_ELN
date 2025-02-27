import React from 'react';
import { configure, mount } from 'enzyme';
import sinon from 'sinon';
import { Form } from 'react-bootstrap';
import { describe, it } from 'mocha';
import expect from 'expect';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';

configure({ adapter: new Adapter() });

describe('AnalysisCommentBoxComponent', () => {
  it('renders the textarea when isVisible is true', () => {
    const mockHandleChange = sinon.spy();
    const wrapper = mount(
      React.createElement(CommentBox, { isVisible: true, value: "Test comment", handleCommentTextChange: mockHandleChange })
    );
    const textarea = wrapper.find(Form.Control);
    expect(textarea.exists()).toBe(true);
    expect(textarea.prop('value')).toBe('Test comment');
  });

  it('does not render the textarea when isVisible is false', () => {
    const mockHandleChange = sinon.spy();
    const wrapper = mount(
      React.createElement(CommentBox, { isVisible: false, value: "", handleCommentTextChange: mockHandleChange })
    );
    expect(wrapper.find(Form.Control).exists()).toBe(false);
  });

  it('calls handleCommentTextChange when text is entered', () => {
    const mockHandleChange = sinon.spy();
    const wrapper = mount(
      React.createElement(CommentBox, { isVisible: true, value: "", handleCommentTextChange: mockHandleChange })
    );

    wrapper.find(Form.Control).simulate('change', { target: { value: 'New comment' } });
    expect(mockHandleChange.calledOnce).toBe(true);
    expect(mockHandleChange.calledWithMatch({ target: { value: 'New comment' } })).toBe(true);
  });
});
