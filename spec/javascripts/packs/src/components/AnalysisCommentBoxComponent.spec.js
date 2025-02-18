import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';
import { Form } from 'react-bootstrap';
import { describe, it } from 'mocha';
import expect from 'expect';
import { CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';

describe('AnalysisCommentBoxComponent', () => {
  it('renders the textarea when isVisible is true', () => {
    const mockHandleChange = sinon.spy();
    const wrapper = mount(
      <CommentBox
        isVisible
        value="Test comment"
        handleCommentTextChange={mockHandleChange}
      />
    );
    const textarea = wrapper.find(Form.Control);
    expect(textarea.exists()).toBe(true);
    expect(textarea.prop('value')).toBe('Test comment');
  });

  it('does not render the textarea when isVisible is false', () => {
    const mockHandleChange = sinon.spy();
    const wrapper = mount(
      <CommentBox
        isVisible={false}
        value=""
        handleCommentTextChange={mockHandleChange}
      />
    );
    expect(wrapper.find(Form.Control).exists()).toBe(false);
  });

  it('calls handleCommentTextChange when text is entered', () => {
    const mockHandleChange = sinon.spy();
    const wrapper = mount(
      <CommentBox
        isVisible
        value=""
        handleCommentTextChange={mockHandleChange}
      />
    );

    wrapper.find(Form.Control).simulate('change', { target: { value: 'New comment' } });
    expect(mockHandleChange.calledOnce).toBe(true);
    expect(mockHandleChange.calledWithMatch({ target: { value: 'New comment' } })).toBe(true);
  });
});
