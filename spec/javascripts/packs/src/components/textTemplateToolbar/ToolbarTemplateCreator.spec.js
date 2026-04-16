import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';

import ToolbarTemplateCreator from 'src/components/textTemplateToolbar/ToolbarTemplateCreator';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

configure({ adapter: new Adapter() });

const defaultProps = {
  template: {},
  templateOptions: [],
  updateTextTemplates: sinon.spy(),
};

describe('ToolbarTemplateCreator', () => {
  beforeEach(() => {
    sinon.stub(TextTemplateStore, 'getState').returns({ personalTemplates: [] });
    sinon.stub(TextTemplateStore, 'listen').returns(undefined);
    sinon.stub(TextTemplateStore, 'unlisten').returns(undefined);
    sinon.stub(TextTemplateActions, 'fetchPersonalTemplates').returns(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('MT dropdown row', () => {
    it('always renders an MT row', () => {
      const wrapper = shallow(React.createElement(ToolbarTemplateCreator, defaultProps));
      const { dropdownTemplates } = wrapper.instance().state;
      const mtRow = dropdownTemplates.find(d => d.isMT);
      expect(mtRow).toBeDefined();
    });

    it('MT row trash button is disabled', () => {
      const wrapper = shallow(React.createElement(ToolbarTemplateCreator, defaultProps));
      const trashButtons = wrapper.find('Button[variant="danger"]');
      const mtButton = trashButtons.filterWhere(b => b.prop('disabled') === true);
      expect(mtButton.length).toBe(1);
    });

    it('non-MT rows have trash button enabled', () => {
      const template = { 'My Dropdown': ['tmpl1'] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const trashButtons = wrapper.find('Button[variant="danger"]');
      const enabledButtons = trashButtons.filterWhere(b => !b.prop('disabled'));
      expect(enabledButtons.length).toBe(1);
    });
  });

  describe('getIconAndDropdown with stable MT keys', () => {
    it('reads MT data from _mt key', () => {
      const template = { _mt: ['tmpl1', 'tmpl2'], _mt_label: 'MT' };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const mtRow = dropdownTemplates.find(d => d.isMT);
      expect(mtRow.data).toEqual(['tmpl1', 'tmpl2']);
    });

    it('uses _mt_label as the MT row name', () => {
      const template = { _mt: [], _mt_label: 'My Templates' };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const mtRow = dropdownTemplates.find(d => d.isMT);
      expect(mtRow.name).toBe('My Templates');
    });

    it('defaults MT row name to MT when _mt_label is absent', () => {
      const template = { _mt: [] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const mtRow = dropdownTemplates.find(d => d.isMT);
      expect(mtRow.name).toBe('MT');
    });

    it('does not treat _mt/_mt_label as regular dropdown keys', () => {
      const template = { _mt: [], _mt_label: 'MT', 'Regular': ['tmpl1'] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const names = dropdownTemplates.map(d => d.name);
      expect(names).not.toContain('_mt');
      expect(names).not.toContain('_mt_label');
      expect(names).toContain('Regular');
    });

    it('extracts _toolbar icon names correctly', () => {
      const template = { _toolbar: ['icon1', 'icon2'] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { iconTemplates } = wrapper.instance().state;
      expect(iconTemplates).toEqual(['icon1', 'icon2']);
    });
  });

  describe('createDropdownTemplate', () => {
    it('adds a new dropdown entry to state', () => {
      const wrapper = shallow(React.createElement(ToolbarTemplateCreator, defaultProps));
      const initialCount = wrapper.instance().state.dropdownTemplates.length;

      wrapper.instance().createDropdownTemplate();
      wrapper.update();

      expect(wrapper.instance().state.dropdownTemplates.length).toBe(initialCount + 1);
    });

  });

  describe('removeDropdownTemplate', () => {
    it('removes the specified non-MT dropdown', () => {
      const template = { 'My Dropdown': ['tmpl1'] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const nonMT = dropdownTemplates.find(d => !d.isMT);

      wrapper.instance().removeDropdownTemplate(nonMT);
      wrapper.update();

      const remaining = wrapper.instance().state.dropdownTemplates;
      expect(remaining.find(d => d.id === nonMT.id)).toBeUndefined();
    });
  });

  describe('personalTemplates merged with templateOptions', () => {
    it('includes personal template names in allOptions', () => {
      sinon.restore();
      sinon.stub(TextTemplateStore, 'getState').returns({
        personalTemplates: [{ id: 1, name: 'personal1', data: {} }]
      });
      sinon.stub(TextTemplateStore, 'listen').returns(undefined);
      sinon.stub(TextTemplateStore, 'unlisten').returns(undefined);
      sinon.stub(TextTemplateActions, 'fetchPersonalTemplates').returns(undefined);

      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, {
          ...defaultProps,
          templateOptions: ['predefined1'],
        })
      );

      // allOptions are passed as `options` to the toolbar Select
      const toolbarSelect = wrapper.find('Select').first();
      const options = toolbarSelect.prop('options');
      const optionValues = options.map(o => o.value);
      expect(optionValues).toContain('predefined1');
      expect(optionValues).toContain('personal1');
    });

    it('deduplicates names that appear in both templateOptions and personalTemplates', () => {
      sinon.restore();
      sinon.stub(TextTemplateStore, 'getState').returns({
        personalTemplates: [{ id: 1, name: 'shared', data: {} }]
      });
      sinon.stub(TextTemplateStore, 'listen').returns(undefined);
      sinon.stub(TextTemplateStore, 'unlisten').returns(undefined);
      sinon.stub(TextTemplateActions, 'fetchPersonalTemplates').returns(undefined);

      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, {
          ...defaultProps,
          templateOptions: ['shared'],
        })
      );

      const toolbarSelect = wrapper.find('Select').first();
      const options = toolbarSelect.prop('options');
      const sharedOptions = options.filter(o => o.value === 'shared');
      expect(sharedOptions.length).toBe(1);
    });
  });
});
