import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import Delta from 'quill-delta';

import { TemplateEditPanel } from 'src/apps/userSettings/TextTemplates';

configure({ adapter: new Adapter() });

const template = { id: 1, name: 'my template', data: { ops: [], text: 'MT', icon: 'fa fa-flask' } };

const render = (props = {}) => shallow(
  React.createElement(TemplateEditPanel, {
    template,
    onSave: sinon.spy(),
    readOnly: false,
    ...props,
  })
);

// nested getEditor() because that is how the panel reaches the live editor on save
const withEditor = (wrapper, contents) => {
  wrapper.instance().reactQuillRef.current = {
    getEditor: () => ({ getContents: () => contents }),
  };
};

describe('TemplateEditPanel', () => {
  describe('saving', () => {
    it('saves the text that is in the editor', () => {
      const onSave = sinon.spy();
      const wrapper = render({ onSave });
      withEditor(wrapper, new Delta().insert('hello\n'));

      wrapper.instance().handleSave();

      expect(onSave.calledOnce).toBe(true);
      expect(onSave.firstCall.args[0].data.ops).toEqual([{ insert: 'hello' }]);
    });

    it('drops the newline Quill always leaves at the end', () => {
      const onSave = sinon.spy();
      const wrapper = render({ onSave });
      withEditor(wrapper, new Delta().insert('hello\n'));

      wrapper.instance().handleSave();

      const saved = onSave.firstCall.args[0].data.ops.map((op) => op.insert).join('');
      expect(saved).toBe('hello');
    });

    it('saves nothing before the editor exists', () => {
      const onSave = sinon.spy();
      const wrapper = render({ onSave });

      wrapper.instance().handleSave();

      expect(onSave.called).toBe(false);
    });
  });
});
