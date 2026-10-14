import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import Delta from 'quill-delta';
import { OrderedSet, fromJS } from 'immutable';

import RichTextEditor from 'src/components/RichTextEditor';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

configure({ adapter: new Adapter() });

// shallow, not mount: Quill needs a real editing surface jsdom cannot give it
const render = (props = {}) => shallow(React.createElement(RichTextEditor, props));

// contents are a real Delta so compose() behaves the way Quill would
const fakeQuill = (text = 'ab\n', selection = { index: 2, length: 0 }) => ({
  focus: sinon.spy(),
  getSelection: () => selection,
  setSelection: sinon.spy(),
  insertText: sinon.spy(),
  setContents: sinon.spy(),
  getContents: () => new Delta().insert(text),
});

const withEditor = (wrapper, quill) => {
  wrapper.instance().ownRef.current = { getEditor: () => quill };
  return quill;
};

const SPECIAL_CHARACTERS_TITLE = 'Special Characters (Ω)';

describe('RichTextEditor', () => {
  beforeEach(() => {
    sinon.stub(TextTemplateStore, 'listen').returns(undefined);
    sinon.stub(TextTemplateStore, 'unlisten').returns(undefined);
    sinon.stub(TextTemplateActions, 'fetchPredefinedTemplateNames').returns(undefined);
    sinon.stub(TextTemplateActions, 'fetchPredefinedTemplateByNames').returns(undefined);
    sinon.stub(TextTemplateActions, 'fetchTextTemplates').returns(undefined);
    sinon.stub(TextTemplateActions, 'updateTextTemplates').returns(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('opt-in toolbar extras', () => {
    it('renders the special characters trigger when asked for', () => {
      const wrapper = render({ specialCharacters: true });
      expect(wrapper.find(`span[title="${SPECIAL_CHARACTERS_TITLE}"]`).length).toBe(1);
    });

    it('leaves the special characters trigger out by default', () => {
      const wrapper = render();
      expect(wrapper.find(`span[title="${SPECIAL_CHARACTERS_TITLE}"]`).length).toBe(0);
    });

    it('allows the indent format when asked for', () => {
      const wrapper = render({ indent: true });
      expect(wrapper.find('ReactQuill').prop('formats')).toContain('indent');
    });

    it('leaves the indent format out by default', () => {
      const wrapper = render();
      expect(wrapper.find('ReactQuill').prop('formats')).not.toContain('indent');
    });

  });

  describe('height', () => {
    it('gives the editor a fixed-height editing area when a height is set', () => {
      const wrapper = render({ height: '230px' });
      const editingArea = wrapper.find('ReactQuill').prop('children');

      expect(editingArea.props.className).toBe('quill-resize');
      expect(editingArea.props.style.height).toBe('230px');
    });

    it('lets the editor grow with its content when no height is set', () => {
      const wrapper = render();
      expect(wrapper.find('ReactQuill').prop('children')).toBe(null);
    });
  });

  describe('template toolbar', () => {
    it('is left out when the editor manages no templates', () => {
      const wrapper = render();
      expect(wrapper.find('TextTemplateToolbar').length).toBe(0);
    });

    it('is rendered when a templateType is given', () => {
      const wrapper = render({ templateType: 'reactionDescription' });
      expect(wrapper.find('TextTemplateToolbar').length).toBe(1);
    });

    it('is rendered when a parent hands down a template setup', () => {
      const wrapper = render({ template: { _tt: ['tmpl1'] } });
      expect(wrapper.find('TextTemplateToolbar').length).toBe(1);
    });
  });

  describe('fetching on mount', () => {
    it('fetches the templates for its own type', () => {
      render({ templateType: 'reactionDescription' });
      expect(TextTemplateActions.fetchTextTemplates.calledWith('reactionDescription')).toBe(true);
    });

    it('touches no store when the editor manages no templates', () => {
      render();
      expect(TextTemplateActions.fetchTextTemplates.called).toBe(false);
      expect(TextTemplateStore.listen.called).toBe(false);
    });

    it('asks for the templates a handed-down setup refers to', () => {
      render({ template: { _tt: ['tmpl1', 'tmpl2'] } });
      expect(TextTemplateActions.fetchPredefinedTemplateByNames.calledWith(['tmpl1', 'tmpl2'])).toBe(true);
    });

    it('asks for a missing template only once', () => {
      const wrapper = render({ template: { _tt: ['tmpl1'] } });
      wrapper.instance().fetchMissingTemplates({ _tt: ['tmpl1'] });

      expect(TextTemplateActions.fetchPredefinedTemplateByNames.callCount).toBe(1);
    });
  });

  describe('saving a toolbar setup', () => {
    it('saves against its own type when it manages templates itself', () => {
      const setup = { _tt: ['tmpl1'] };
      const wrapper = render({ templateType: 'reactionDescription' });

      wrapper.instance().updateTextTemplates(setup);

      expect(TextTemplateActions.updateTextTemplates.calledWith('reactionDescription', setup)).toBe(true);
    });

    it('hands the setup back to the parent when the parent owns it', () => {
      const updateTextTemplates = sinon.spy();
      const setup = { _tt: ['tmpl1'] };
      const wrapper = render({ template: {}, updateTextTemplates });

      wrapper.instance().updateTextTemplates(setup);

      expect(updateTextTemplates.calledWith(setup)).toBe(true);
      expect(TextTemplateActions.updateTextTemplates.called).toBe(false);
    });
  });

  describe('editor ref', () => {
    it('uses the ref a parent passes in, so the parent can reach the editor', () => {
      const innerRef = React.createRef();
      const wrapper = render({ innerRef });

      expect(wrapper.instance().editorRef()).toBe(innerRef);
    });

    it('falls back to its own ref when the parent passes none', () => {
      const wrapper = render();
      const instance = wrapper.instance();

      expect(instance.editorRef()).toBe(instance.ownRef);
    });
  });

  describe('inserting a special character', () => {
    it('drops the character at the cursor and moves the cursor past it', () => {
      const wrapper = render({ specialCharacters: true });
      const quill = withEditor(wrapper, fakeQuill());

      wrapper.instance().insertText('Ω');

      expect(quill.insertText.calledWith(2, 'Ω')).toBe(true);
      expect(quill.setSelection.calledWith({ index: 3, length: 0 })).toBe(true);
    });

    it('reports the insert so the element is marked unsaved', () => {
      const onChange = sinon.spy();
      const wrapper = render({ specialCharacters: true, onChange });
      withEditor(wrapper, fakeQuill());

      wrapper.instance().insertText('Ω');

      expect(onChange.calledOnce).toBe(true);
    });

    it('does nothing when the editor has no cursor', () => {
      const wrapper = render({ specialCharacters: true });
      const quill = withEditor(wrapper, fakeQuill('ab\n', null));

      wrapper.instance().insertText('Ω');

      expect(quill.insertText.called).toBe(false);
    });

    it('does nothing before the editor exists', () => {
      const onChange = sinon.spy();
      const wrapper = render({ specialCharacters: true, onChange });

      wrapper.instance().insertText('Ω');

      expect(onChange.called).toBe(false);
    });
  });

  describe('applying a template', () => {
    it('merges the template into the text at the cursor', () => {
      const wrapper = render({ templateType: 'reactionDescription' });
      const quill = withEditor(wrapper, fakeQuill());

      wrapper.instance().applyTemplate({ ops: [{ insert: 'X' }] });

      const merged = quill.setContents.firstCall.args[0];
      expect(merged.ops[0].insert).toBe('abX\n');
      expect(quill.setSelection.calledWith({ index: 3, length: 0 })).toBe(true);
    });

    it('ignores a template that carries no content', () => {
      const wrapper = render({ templateType: 'reactionDescription' });
      const quill = withEditor(wrapper, fakeQuill());

      wrapper.instance().applyTemplate({ name: 'empty' });

      expect(quill.setContents.called).toBe(false);
    });

  });

  describe('reading templates out of the store', () => {
    const storeState = (own) => ({
      reactionDescription: fromJS(own),
      fetchedPredefinedTemplates: fromJS({ tmpl1: { name: 'tmpl1', data: {} } }),
      predefinedTemplateNames: OrderedSet(['tmpl1']),
    });

    it('picks up the setup saved against its own type', () => {
      const wrapper = render({ templateType: 'reactionDescription' });

      wrapper.instance().onTemplateStoreChange(storeState({ _tt: ['tmpl1'], _tt_label: 'TT' }));

      expect(wrapper.instance().state.template).toEqual({ _tt: ['tmpl1'], _tt_label: 'TT' });
    });

    it('keeps an empty setup when the store holds nothing for its type', () => {
      const wrapper = render({ templateType: 'screen' });

      wrapper.instance().onTemplateStoreChange(storeState({ _tt: ['tmpl1'] }));

      expect(wrapper.instance().state.template).toEqual({});
    });
  });

  describe('change events', () => {
    it('reports edits made by the user', () => {
      const onChange = sinon.spy();
      const contents = { ops: [{ insert: 'hello' }] };
      const wrapper = render({ onChange });

      wrapper.instance().onEditorChange(null, null, 'user', { getContents: () => contents });

      expect(onChange.calledWith(contents)).toBe(true);
    });

    it('stays quiet while content is being loaded, so nothing looks unsaved', () => {
      const onChange = sinon.spy();
      const wrapper = render({ onChange });

      wrapper.instance().onEditorChange(null, null, 'api', { getContents: () => ({}) });

      expect(onChange.called).toBe(false);
    });
  });
});
