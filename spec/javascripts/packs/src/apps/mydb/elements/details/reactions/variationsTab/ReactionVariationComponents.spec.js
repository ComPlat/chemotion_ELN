import expect from 'expect';
import {
  isInputKeyboardEvent
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationComponents';

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
