import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';

import TextTemplateToolbar from 'src/components/textTemplateToolbar/TextTemplateToolbar';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

configure({ adapter: new Adapter() });

// Stub store and actions to prevent HTTP calls
const stubStoreAndActions = () => {
  sinon.stub(TextTemplateStore, 'listen').returns(undefined);
  sinon.stub(TextTemplateStore, 'unlisten').returns(undefined);
  sinon.stub(TextTemplateActions, 'fetchPersonalTemplates').returns(undefined);
};

describe('TextTemplateToolbar', () => {
  beforeEach(() => {
    sinon.stub(TextTemplateStore, 'getState').returns({ personalTemplates: [] });
    stubStoreAndActions();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('TT dropdown', () => {
    it('renders a ToolbarDropdown for _tt key', () => {
      const template = { _tt: ['template1'], _tt_label: 'TT' };
      const predefinedTemplates = { template1: { name: 'template1', data: {} } };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates,
          applyTemplate: () => {}
        })
      );

      expect(wrapper.find('ToolbarDropdown').length).toBe(1);
    });

    it('uses _tt_label as the dropdown label', () => {
      const template = { _tt: ['template1'], _tt_label: 'Text Templates' };
      const predefinedTemplates = { template1: { name: 'template1', data: {} } };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates,
          applyTemplate: () => {}
        })
      );

      expect(wrapper.find('ToolbarDropdown').prop('label')).toBe('Text Templates');
    });

    it('defaults label to TT when _tt_label is absent', () => {
      const template = { _tt: ['template1'] };
      const predefinedTemplates = { template1: { name: 'template1', data: {} } };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates,
          applyTemplate: () => {}
        })
      );

      expect(wrapper.find('ToolbarDropdown').prop('label')).toBe('TT');
    });

    it('renders no ToolbarDropdown when _tt is absent', () => {
      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template: {},
          predefinedTemplates: {},
          applyTemplate: () => {}
        })
      );

      expect(wrapper.find('ToolbarDropdown').length).toBe(0);
    });
  });

  describe('stale template filtering', () => {
    it('excludes deleted templates from the TT dropdown items', () => {
      // _tt references 'deleted' which is not in predefined or personal
      const template = { _tt: ['existing', 'deleted'], _tt_label: 'TT' };
      const predefinedTemplates = { existing: { name: 'existing', data: {} } };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates,
          applyTemplate: () => {}
        })
      );

      const items = wrapper.find('ToolbarDropdown').prop('items');
      expect(Object.values(items)).toContain('existing');
      expect(Object.values(items)).not.toContain('deleted');
    });

    it('excludes renamed templates from the dropdown items', () => {
      // _tt references 'old-name' which was renamed — not in predefined anymore
      const template = { _tt: ['old-name', 'new-name'], _tt_label: 'TT' };
      const predefinedTemplates = { 'new-name': { name: 'new-name', data: {} } };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates,
          applyTemplate: () => {}
        })
      );

      const items = wrapper.find('ToolbarDropdown').prop('items');
      expect(Object.values(items)).toContain('new-name');
      expect(Object.values(items)).not.toContain('old-name');
    });
  });

  describe('template resolution', () => {
    it('resolves templates from predefinedTemplates', () => {
      const template = { _tt: ['predefined1'], _tt_label: 'TT' };
      const predefinedTemplates = { predefined1: { name: 'predefined1', data: { ops: [{ insert: 'hello' }] } } };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates,
          applyTemplate: () => {}
        })
      );

      const items = wrapper.find('ToolbarDropdown').prop('items');
      expect(Object.values(items)).toContain('predefined1');
    });

    it('resolves templates from personalTemplates via store', () => {
      sinon.restore();
      sinon.stub(TextTemplateStore, 'getState').returns({
        personalTemplates: [{ id: 1, name: 'personal1', data: {} }]
      });
      stubStoreAndActions();

      const template = { _tt: ['personal1'], _tt_label: 'TT' };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates: {},
          applyTemplate: () => {}
        })
      );

      const items = wrapper.find('ToolbarDropdown').prop('items');
      expect(Object.values(items)).toContain('personal1');
    });
  });

  describe('icon templates', () => {
    it('renders a ToolbarIcon for each valid _toolbar entry', () => {
      const template = { _toolbar: ['tmpl1', 'tmpl2'] };
      const predefinedTemplates = {
        tmpl1: { name: 'tmpl1', data: {} },
        tmpl2: { name: 'tmpl2', data: {} },
      };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates,
          applyTemplate: () => {}
        })
      );

      expect(wrapper.find('ToolbarIcon').length).toBe(2);
    });

    it('renders an empty span for unresolvable _toolbar entries', () => {
      const template = { _toolbar: ['missing'] };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates: {},
          applyTemplate: () => {}
        })
      );

      expect(wrapper.find('ToolbarIcon').length).toBe(0);
      expect(wrapper.find('span').length).toBe(1);
    });
  });

  describe('applyTemplate', () => {
    it('calls applyTemplate with template data when dropdown item is selected', () => {
      const applyTemplate = sinon.spy();
      const templateData = { ops: [{ insert: 'hello' }] };
      const template = { _tt: ['tmpl1'], _tt_label: 'TT' };
      const predefinedTemplates = { tmpl1: { name: 'tmpl1', data: templateData } };

      const wrapper = shallow(
        React.createElement(TextTemplateToolbar, {
          template,
          predefinedTemplates,
          applyTemplate
        })
      );

      wrapper.find('ToolbarDropdown').prop('onSelect')('TMPL1', 'tmpl1');
      expect(applyTemplate.calledOnce).toBe(true);
      expect(applyTemplate.calledWith(templateData)).toBe(true);
    });
  });
});
