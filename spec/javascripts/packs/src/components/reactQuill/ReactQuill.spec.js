import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';

import ReactQuill from 'src/components/reactQuill/ReactQuill';

configure({ adapter: new Adapter() });

// lifecycle off and a stand-in editor attached by hand: jsdom cannot run real Quill
const renderWithFakeEditor = (props = {}) => {
  const editor = { disable: sinon.spy(), enable: sinon.spy() };
  const wrapper = shallow(
    React.createElement(ReactQuill, props),
    { disableLifecycleMethods: true }
  );
  wrapper.instance().editor = editor;

  return { wrapper, editor };
};

describe('ReactQuill', () => {
  describe('setEditorReadOnly', () => {
    it('locks the editor when read-only', () => {
      const { wrapper, editor } = renderWithFakeEditor();

      wrapper.instance().setEditorReadOnly(editor, true);

      expect(editor.disable.calledOnce).toBe(true);
      expect(editor.enable.called).toBe(false);
    });

    it('unlocks the editor when not read-only', () => {
      const { wrapper, editor } = renderWithFakeEditor();

      wrapper.instance().setEditorReadOnly(editor, false);

      expect(editor.enable.calledOnce).toBe(true);
      expect(editor.disable.called).toBe(false);
    });
  });

  // this used to throw: the editor argument was skipped and the value inverted
  describe('switching read-only while mounted', () => {
    it('locks the editor when the element becomes read-only', () => {
      const { wrapper, editor } = renderWithFakeEditor({ readOnly: false });
      const instance = wrapper.instance();

      instance.shouldComponentUpdate({ readOnly: true }, instance.state);

      expect(editor.disable.calledOnce).toBe(true);
      expect(editor.enable.called).toBe(false);
    });

    it('unlocks the editor when the element becomes editable', () => {
      const { wrapper, editor } = renderWithFakeEditor({ readOnly: true });
      const instance = wrapper.instance();

      instance.shouldComponentUpdate({ readOnly: false }, instance.state);

      expect(editor.enable.calledOnce).toBe(true);
      expect(editor.disable.called).toBe(false);
    });

    it('leaves the editor alone when read-only has not changed', () => {
      const { wrapper, editor } = renderWithFakeEditor({ readOnly: true });
      const instance = wrapper.instance();

      instance.shouldComponentUpdate({ readOnly: true }, instance.state);

      expect(editor.disable.called).toBe(false);
      expect(editor.enable.called).toBe(false);
    });
  });
});
