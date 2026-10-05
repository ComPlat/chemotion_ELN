import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import Delta from 'quill-delta';

// first on purpose: the models are circular and break if reached via the component
import 'src/models/Component';

import ContainerComponent from 'src/components/container/ContainerComponent';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

configure({ adapter: new Adapter() });

const buildContainer = (content) => ({
  id: 1,
  name: 'analysis',
  description: '',
  container_type: 'analysis',
  extended_metadata: {
    kind: '1H NMR',
    status: 'Confirmed',
    content,
  },
  children: [],
});

const render = (props = {}) => {
  const container = buildContainer(new Delta().insert('1H NMR (CDCl3)\n'));

  return shallow(
    React.createElement(ContainerComponent, {
      container,
      rootContainer: container,
      templateType: 'sample',
      onChange: sinon.spy(),
      ...props,
    })
  );
};

describe('ContainerComponent', () => {
  beforeEach(() => {
    sinon.stub(TextTemplateStore, 'getState').returns({});
    sinon.stub(TextTemplateStore, 'listen').returns(undefined);
    sinon.stub(TextTemplateStore, 'unlisten').returns(undefined);
    sinon.stub(TextTemplateActions, 'updateTextTemplates').returns(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('the description editor', () => {
    it('lets the analysis manage its own templates', () => {
      const wrapper = render({ templateType: 'sample' });
      expect(wrapper.find('RichTextEditor').length).toBe(1);
    });

    it('offers the auto-format button next to the standard toolbar', () => {
      const wrapper = render();
      const extras = wrapper.find('RichTextEditor').prop('toolbarExtras');

      expect(extras.props.title).toBe('Auto Format');
    });
  });

  describe('auto format', () => {
    const withEditor = (wrapper, quill) => {
      wrapper.instance().editorRef.current = { getEditor: () => quill };
      return quill;
    };

    it('writes the formatted text back into the editor', () => {
      const wrapper = render();
      const quill = withEditor(wrapper, {
        setContents: sinon.spy(),
        getContents: () => new Delta().insert('formatted\n'),
      });

      wrapper.instance().autoFormatContent();

      expect(quill.setContents.calledOnce).toBe(true);
    });

    it('tells the parent the analysis changed', () => {
      const onChange = sinon.spy();
      const wrapper = render({ onChange });
      withEditor(wrapper, {
        setContents: sinon.spy(),
        getContents: () => new Delta().insert('formatted\n'),
      });

      wrapper.instance().autoFormatContent();

      expect(onChange.calledOnce).toBe(true);
      expect(onChange.firstCall.args[0].extended_metadata.content.ops[0].insert).toBe('formatted\n');
    });

    it('does nothing before the editor exists', () => {
      const onChange = sinon.spy();
      const wrapper = render({ onChange });

      wrapper.instance().autoFormatContent();

      expect(onChange.called).toBe(false);
    });
  });

  describe('saving a toolbar setup', () => {
    it('saves it against the element type the analysis belongs to', () => {
      const setup = { _tt: ['tmpl1'] };
      const wrapper = render({ templateType: 'wellplate' });

      wrapper.instance().updateTextTemplates(setup);

      expect(TextTemplateActions.updateTextTemplates.calledWith('wellplate', setup)).toBe(true);
    });
  });
});
