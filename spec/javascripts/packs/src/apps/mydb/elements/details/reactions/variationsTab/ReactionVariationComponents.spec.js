import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { act } from 'react-dom/test-utils';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  ColumnVisibilityHeader, isInputKeyboardEvent, useGridHeightCap
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationComponents';
import VariationsGridContext
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsGridContext';

configure({ adapter: new Adapter() });

/*
The grid's cells hold live inputs, not AG Grid editors, so the grid treats every key as aimed at
itself unless suppressKeyboardEvent hands it back - which isInputKeyboardEvent decides.
*/
describe('ReactionVariationComponents isInputKeyboardEvent', () => {
  const keyIn = (tagName, key, modifiers = {}) => ({ target: { tagName }, key, ...modifiers });

  it('hands Ctrl+A and Cmd+A in an input to the input, to select its text', () => {
    expect(isInputKeyboardEvent(keyIn('INPUT', 'a', { ctrlKey: true }))).toBe(true);
    expect(isInputKeyboardEvent(keyIn('INPUT', 'a', { metaKey: true }))).toBe(true);
    expect(isInputKeyboardEvent(keyIn('TEXTAREA', 'A', { ctrlKey: true, shiftKey: true }))).toBe(true);
  });

  it('hands the other text shortcuts to the input as well', () => {
    ['c', 'v', 'x', 'z', 'y'].forEach((key) => {
      expect(isInputKeyboardEvent(keyIn('INPUT', key, { ctrlKey: true }))).toBe(true);
    });
  });

  it('hands the caret keys to the input', () => {
    expect(isInputKeyboardEvent(keyIn('INPUT', 'ArrowLeft'))).toBe(true);
    expect(isInputKeyboardEvent(keyIn('INPUT', 'Home'))).toBe(true);
  });

  it('leaves a plain letter and other shortcuts to the grid', () => {
    expect(isInputKeyboardEvent(keyIn('INPUT', 'a'))).toBe(false);
    expect(isInputKeyboardEvent(keyIn('INPUT', 'd', { ctrlKey: true }))).toBe(false);
  });

  it('leaves every key to the grid outside an input', () => {
    expect(isInputKeyboardEvent(keyIn('DIV', 'a', { ctrlKey: true }))).toBe(false);
    expect(isInputKeyboardEvent(keyIn('DIV', 'ArrowLeft'))).toBe(false);
  });
});

/*
"Hide all" in a group's column picker clears the checkboxes but keeps the popover open, so a single
column can be picked; hiding every column at once would take the header and the popover with it.
*/
describe('ReactionVariationComponents ColumnVisibilityHeader', () => {
  const columns = [
    { colId: 'mass', headerName: 'Mass' },
    { colId: 'volume', headerName: 'Volume' },
    { colId: 'amount', headerName: 'Amount' },
  ];

  const render = () => {
    const setColumnsHidden = sinon.spy();
    const wrapper = mount(
      <VariationsGridContext.Provider value={{ hiddenColumns: [], setColumnsHidden }}>
        <ColumnVisibilityHeader displayName="Water" columns={columns} movable={false} />
      </VariationsGridContext.Provider>,
      { attachTo: document.body.appendChild(document.createElement('div')) }
    );
    act(() => { wrapper.find('button[title="Show or hide columns"]').simulate('click'); });
    wrapper.update();
    return { wrapper, setColumnsHidden };
  };

  const clickLink = (wrapper, text) => {
    act(() => { wrapper.find('button').filterWhere((button) => button.text() === text).simulate('click'); });
    wrapper.update();
  };
  const checkboxes = (wrapper) => wrapper.find('input[type="checkbox"]');

  it('clears every checkbox on "Hide all", keeping the popover open and the columns shown', () => {
    const { wrapper, setColumnsHidden } = render();
    clickLink(wrapper, 'Hide all');

    expect(checkboxes(wrapper).length).toBe(3);
    checkboxes(wrapper).forEach((checkbox) => expect(checkbox.prop('checked')).toBe(false));
    expect(setColumnsHidden.called).toBe(false);
    wrapper.detach();
  });

  it('keeps the one column ticked after "Hide all" and hides the others', () => {
    const { wrapper, setColumnsHidden } = render();
    clickLink(wrapper, 'Hide all');
    act(() => { checkboxes(wrapper).at(1).simulate('change', { target: { checked: true } }); });

    expect(setColumnsHidden.calledWith(['mass', 'amount'], true)).toBe(true);
    expect(setColumnsHidden.calledWith(['volume'], false)).toBe(true);
    expect(setColumnsHidden.calledWith(['mass', 'volume', 'amount'], true)).toBe(false);
    wrapper.detach();
  });
});

/*
The grid takes as much height as one screen leaves it below the tab bar and the toolbars, and only once
its rows need more; it never gets shorter than a few rows.
*/
describe('ReactionVariationComponents useGridHeightCap', () => {
  let container;

  const rect = (top) => () => ({ top, bottom: top, left: 0, right: 0, width: 0, height: 0 });
  const withHeight = (element, height) => Object.defineProperty(element, 'offsetHeight', { value: height });

  // A detail card showing `visible` px, with the tab bar at the top and the grid `above` px below it.
  const buildCard = ({ visible, above, content }) => {
    container = document.createElement('div');
    container.className = 'detail-card__scroll-container';
    Object.defineProperty(container, 'clientHeight', { value: visible });
    const tabBar = document.createElement('ul');
    tabBar.className = 'nav-tabs has-config-overlay';
    tabBar.getBoundingClientRect = rect(0);
    const grid = document.createElement('div');
    grid.getBoundingClientRect = rect(above);
    const header = document.createElement('div');
    header.className = 'ag-header';
    withHeight(header, 50);
    const rows = document.createElement('div');
    rows.className = 'ag-center-cols-container';
    withHeight(rows, content - 52);
    grid.append(header, rows);
    container.append(tabBar, grid);
    document.body.append(container);
    return grid;
  };

  const heightFor = (card) => {
    const grid = buildCard(card);
    let result;
    const Harness = () => {
      result = useGridHeightCap({ current: grid }, { current: null });
      return null;
    };
    const wrapper = mount(<Harness />);
    act(() => { result.syncGridHeight(); });
    const { gridHeight } = result;
    wrapper.unmount();
    container.remove();
    return gridHeight;
  };

  it('fills the screen below the tab bar and the toolbars once the rows need more', () => {
    expect(heightFor({ visible: 800, above: 150, content: 2000 })).toBe(800 - 150 - 16);
  });

  it('leaves a grid whose rows fit as tall as they are', () => {
    expect(heightFor({ visible: 800, above: 150, content: 300 })).toBe(null);
  });

  it('keeps a few rows in a short window', () => {
    expect(heightFor({ visible: 200, above: 150, content: 2000 })).toBe(200);
  });

  it('pays no attention to a height dragged in an earlier version', () => {
    window.localStorage.setItem('userundefined-reactionVariationsGridHeight', '120');
    expect(heightFor({ visible: 800, above: 150, content: 2000 })).toBe(634);
    window.localStorage.removeItem('userundefined-reactionVariationsGridHeight');
  });
});
