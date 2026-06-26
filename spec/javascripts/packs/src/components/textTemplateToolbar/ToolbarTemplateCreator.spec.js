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

  describe('TT dropdown row', () => {
    it('always renders a TT row', () => {
      const wrapper = shallow(React.createElement(ToolbarTemplateCreator, defaultProps));
      const { dropdownTemplates } = wrapper.instance().state;
      const ttRow = dropdownTemplates.find(d => d.isTT);
      expect(ttRow).toBeDefined();
    });

    it('TT row trash button is disabled', () => {
      const wrapper = shallow(React.createElement(ToolbarTemplateCreator, defaultProps));
      const trashButtons = wrapper.find('Button[variant="danger"]');
      const mtButton = trashButtons.filterWhere(b => b.prop('disabled') === true);
      expect(mtButton.length).toBe(1);
    });

    it('non-TT rows have trash button enabled', () => {
      const template = { 'My Dropdown': ['tmpl1'] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const trashButtons = wrapper.find('Button[variant="danger"]');
      const enabledButtons = trashButtons.filterWhere(b => !b.prop('disabled'));
      expect(enabledButtons.length).toBe(1);
    });
  });

  describe('getIconAndDropdown with stable TT keys', () => {
    it('reads TT data from _tt key', () => {
      const template = { _tt: ['tmpl1', 'tmpl2'], _tt_label: 'TT' };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const ttRow = dropdownTemplates.find(d => d.isTT);
      expect(ttRow.data).toEqual(['tmpl1', 'tmpl2']);
    });

    it('uses _tt_label as the TT row name', () => {
      const template = { _tt: [], _tt_label: 'Text Templates' };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const ttRow = dropdownTemplates.find(d => d.isTT);
      expect(ttRow.name).toBe('Text Templates');
    });

    it('defaults TT row name to TT when _tt_label is absent', () => {
      const template = { _tt: [] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const ttRow = dropdownTemplates.find(d => d.isTT);
      expect(ttRow.name).toBe('TT');
    });

    it('does not treat _tt/_tt_label as regular dropdown keys', () => {
      const template = { _tt: [], _tt_label: 'TT', 'Regular': ['tmpl1'] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const names = dropdownTemplates.map(d => d.name);
      expect(names).not.toContain('_tt');
      expect(names).not.toContain('_tt_label');
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
    it('removes the specified non-TT dropdown', () => {
      const template = { 'My Dropdown': ['tmpl1'] };
      const wrapper = shallow(
        React.createElement(ToolbarTemplateCreator, { ...defaultProps, template })
      );
      const { dropdownTemplates } = wrapper.instance().state;
      const nonTT = dropdownTemplates.find(d => !d.isTT);

      wrapper.instance().removeDropdownTemplate(nonTT);
      wrapper.update();

      const remaining = wrapper.instance().state.dropdownTemplates;
      expect(remaining.find(d => d.id === nonTT.id)).toBeUndefined();
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
