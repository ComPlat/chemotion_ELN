import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { act } from 'react-dom/test-utils';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  ColumnVisibilityHeader, isInputKeyboardEvent
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
