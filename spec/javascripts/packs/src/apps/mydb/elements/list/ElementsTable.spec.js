import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

import ElementsTable from 'src/apps/mydb/elements/list/ElementsTable';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';

configure({ adapter: new Adapter() });

// Minimal UIStore shape the component reads in the constructor + onChangeUI.
// `sample`/`reaction`/`wellplate` must exist because onChangeUI dereferences
// `state.sample.currentId` etc. on mount.
const buildUIState = (overrides = {}) => ({
  groupCollapse: {},
  filterCreatedAt: true,
  number_of_results: 15,
  currentSearchByID: null,
  fromDate: null,
  toDate: null,
  userLabel: null,
  productOnly: false,
  sample: {},
  reaction: {},
  wellplate: {},
  ...overrides,
});

describe('ElementsTable — collapsible filter panel (PR #3227 blocking-fix coverage)', () => {
  let sandbox;

  const mountTable = (uiOverrides = {}, props = {}) => {
    const type = props.type || 'cell_line';
    // onChangeUI early-returns unless `state[type]` exists, so inject it —
    // otherwise `this.state.ui` (which hasActiveFilters reads) stays empty.
    UIStore.getState.returns(buildUIState({ [type]: {}, ...uiOverrides }));
    return shallow(
      React.createElement(ElementsTable, { type, ...props })
    );
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(UIStore, 'getState');
    sandbox.stub(UIStore, 'listen');
    sandbox.stub(UIStore, 'unlisten');
    sandbox.stub(ElementStore, 'listen');
    sandbox.stub(ElementStore, 'unlisten');
    sandbox.stub(ElementStore, 'getState').returns({ moleculeSort: false, elements: {} });
    sandbox.stub(UIActions, 'setUserLabel');
    sandbox.stub(UIActions, 'setFromDate');
    sandbox.stub(UIActions, 'setToDate');
    sandbox.stub(UIActions, 'setProductOnly');
    sandbox.stub(UIActions, 'setFilterCreatedAt');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('toggleFilters (blocking #1 — panel must always collapse)', () => {
    it('opens then closes the panel when no filter is active', () => {
      const wrapper = mountTable();
      const instance = wrapper.instance();
      expect(instance.state.showFilters).toBe(false);

      instance.toggleFilters();
      expect(instance.state.showFilters).toBe(true);

      instance.toggleFilters();
      expect(instance.state.showFilters).toBe(false);
    });

    it('still closes the panel while a filter is active (the fixed regression)', () => {
      // Persisted userLabel → panel starts open (see blocking #2 test below).
      const wrapper = mountTable({ userLabel: 42 });
      const instance = wrapper.instance();
      expect(instance.hasActiveFilters()).toBe(true);
      expect(instance.state.showFilters).toBe(true);

      // Before the fix this early-returned and left the panel stuck open.
      instance.toggleFilters();
      expect(instance.state.showFilters).toBe(false);
    });

    it('no longer keeps the dead filterCloseHint flag in state', () => {
      const wrapper = mountTable({ userLabel: 42 });
      expect(wrapper.instance().state.filterCloseHint).toBe(undefined);
    });
  });

  describe('initial showFilters (blocking #2 — persisted filters are visible)', () => {
    it('defaults to collapsed when no filter is persisted', () => {
      const wrapper = mountTable();
      expect(wrapper.instance().state.showFilters).toBe(false);
    });

    it('auto-opens when a user label is persisted in UIStore', () => {
      const wrapper = mountTable({ userLabel: 42 });
      expect(wrapper.instance().state.showFilters).toBe(true);
    });

    it('auto-opens when a date window is persisted in UIStore', () => {
      const wrapper = mountTable({ fromDate: new Date('2026-01-01') });
      expect(wrapper.instance().state.showFilters).toBe(true);
    });

    it('auto-opens when the products-only filter is persisted', () => {
      const wrapper = mountTable({ productOnly: true }, { type: 'sample' });
      expect(wrapper.instance().state.showFilters).toBe(true);
    });
  });

  describe('toggle button reflects filter-active state independently of open/closed', () => {
    const toggleBtn = (wrapper) => wrapper.find('.elements-table-header__filters-toggle-btn');

    it('renders the secondary variant with no active filter', () => {
      const wrapper = mountTable();
      const btn = toggleBtn(wrapper);
      expect(btn.prop('variant')).toBe('secondary');
      expect(btn.hasClass('has-active-filters')).toBe(false);
    });

    it('renders the primary variant + has-active-filters class when a filter is active', () => {
      const wrapper = mountTable({ userLabel: 42 });
      const btn = toggleBtn(wrapper);
      expect(btn.prop('variant')).toBe('primary');
      expect(btn.hasClass('has-active-filters')).toBe(true);
    });

    it('keeps the active-filter variant after the panel is collapsed', () => {
      const wrapper = mountTable({ userLabel: 42 });
      wrapper.instance().toggleFilters(); // collapse
      wrapper.update();
      const btn = toggleBtn(wrapper);
      expect(wrapper.instance().state.showFilters).toBe(false);
      expect(btn.prop('variant')).toBe('primary');
    });
  });

  describe('clearFilters', () => {
    it('clears every active UIStore filter via UIActions', () => {
      const wrapper = mountTable({
        userLabel: 42,
        fromDate: new Date('2026-01-01'),
        toDate: new Date('2026-02-01'),
        productOnly: true,
      }, { type: 'sample' });

      wrapper.instance().clearFilters();

      expect(UIActions.setUserLabel.calledOnceWith(null)).toBe(true);
      expect(UIActions.setFromDate.calledOnceWith(null)).toBe(true);
      expect(UIActions.setToDate.calledOnceWith(null)).toBe(true);
      expect(UIActions.setProductOnly.calledOnceWith(false)).toBe(true);
    });

    it('leaves the panel toggleable afterwards (no filterCloseHint side effect)', () => {
      const wrapper = mountTable({ userLabel: 42 }, { type: 'sample' });
      const instance = wrapper.instance();

      instance.clearFilters();
      instance.toggleFilters();
      expect(instance.state.showFilters).toBe(false);
      instance.toggleFilters();
      expect(instance.state.showFilters).toBe(true);
    });
  });
});
