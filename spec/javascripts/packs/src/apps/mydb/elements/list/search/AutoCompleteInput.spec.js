import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { ListGroup } from 'react-bootstrap';
import AutoCompleteInput from 'src/apps/mydb/elements/list/search/AutoCompleteInput';
import UIStore from 'src/stores/alt/stores/UIStore';

configure({ adapter: new Adapter() });

const buildSuggestions = (count) => Array.from({ length: count }, (_, i) => ({
  name: `suggestion ${i}`,
  search_by_method: 'sample_name',
}));

const activeIndexes = (wrapper) => wrapper.update().find(ListGroup.Item)
  .map((item, index) => (item.prop('active') ? index : null))
  .filter((index) => index !== null);

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const keyDown = (keyCode) => ({ keyCode, preventDefault: () => {} });
const DOWN = 40;
const UP = 38;

describe('AutoCompleteInput', () => {
  let wrapper;

  const mountWith = (suggestionsFn = () => Promise.resolve([])) => {
    wrapper = mount(<AutoCompleteInput suggestions={suggestionsFn} />);
    return wrapper;
  };

  afterEach(() => {
    if (wrapper) wrapper.unmount();
    wrapper = null;
  });

  describe('focusSuggestion', () => {
    it('focuses an entry after the suggestion list got shorter', () => {
      mountWith();
      wrapper.setState({ suggestions: buildSuggestions(5), showSuggestions: true });
      wrapper.instance().focusSuggestion(4);
      expect(wrapper.state('suggestionFocus')).toEqual(4);

      wrapper.setState({ suggestions: buildSuggestions(2) });
      expect(() => wrapper.instance().focusSuggestion(0)).not.toThrow();

      expect(wrapper.state('suggestionFocus')).toEqual(0);
      expect(wrapper.state('value')).toEqual('suggestion 0');
      expect(activeIndexes(wrapper)).toEqual([0]);
    });

    it('moves the highlight to the focused entry only', () => {
      mountWith();
      wrapper.setState({ suggestions: buildSuggestions(3), showSuggestions: true });
      wrapper.instance().focusSuggestion(1);
      wrapper.instance().focusSuggestion(2);

      expect(activeIndexes(wrapper)).toEqual([2]);
    });

    it('ignores an index that is not in the current list', () => {
      mountWith();
      wrapper.setState({ suggestions: buildSuggestions(2), showSuggestions: true, suggestionFocus: 1 });

      expect(() => wrapper.instance().focusSuggestion(7)).not.toThrow();
      expect(wrapper.state('suggestionFocus')).toEqual(1);
    });

    it('keeps the focus when it happens while a typed fetch is still pending', async function () {
      this.timeout(3000);
      const suggestionsFn = sinon.stub().resolves(buildSuggestions(3));
      mountWith(suggestionsFn);
      wrapper.setState({ suggestions: buildSuggestions(3), showSuggestions: true });

      // typing schedules a fetch 600 ms later; the user arrows down before it fires
      wrapper.instance().handleValueChange({ target: { value: 'sugg' } }, wrapper.instance().doneTyping);
      wrapper.instance().handleKeyDown(keyDown(DOWN));
      await wait(900);

      expect(suggestionsFn.called).toBe(false);
      expect(wrapper.state('suggestionFocus')).toEqual(0);
      expect(wrapper.state('value')).toEqual('suggestion 0');
    });
  });

  describe('keyboard navigation', () => {
    it('starts at the first entry on Down and at the last one on Up', () => {
      mountWith();
      wrapper.setState({ suggestions: buildSuggestions(5), showSuggestions: true });
      wrapper.instance().handleKeyDown(keyDown(DOWN));
      expect(wrapper.state('suggestionFocus')).toEqual(0);

      wrapper.setState({ suggestionFocus: null, valueBeforeFocus: null });
      wrapper.instance().handleKeyDown(keyDown(UP));
      expect(wrapper.state('suggestionFocus')).toEqual(4);
    });

    it('wraps around at both ends', () => {
      mountWith();
      wrapper.setState({ suggestions: buildSuggestions(3), showSuggestions: true, suggestionFocus: 2 });
      wrapper.instance().handleKeyDown(keyDown(DOWN));
      expect(wrapper.state('suggestionFocus')).toEqual(0);

      wrapper.instance().handleKeyDown(keyDown(UP));
      expect(wrapper.state('suggestionFocus')).toEqual(2);
    });

    it('works again after an empty result was followed by results', async () => {
      mountWith(() => Promise.resolve(buildSuggestions(2)));
      wrapper.setState({ error: 'Nothing was found.', suggestions: null });

      wrapper.instance().fetchSuggestions('sugg');
      await wait(300);
      wrapper.instance().handleKeyDown(keyDown(DOWN));

      expect(wrapper.state('error')).toEqual('');
      expect(wrapper.state('suggestionFocus')).toEqual(0);
    });
  });

  describe('unmount', () => {
    it('stops listening to UIStore', () => {
      const unlisten = sinon.spy(UIStore, 'unlisten');
      try {
        mountWith();
        const { onUIChange } = wrapper.instance();
        wrapper.unmount();
        wrapper = null;

        expect(unlisten.calledWith(onUIChange)).toBe(true);
      } finally {
        unlisten.restore();
      }
    });
  });

  describe('fetchSuggestions', () => {
    it('clears the focus when a new result list arrives', async () => {
      mountWith(() => Promise.resolve(buildSuggestions(2)));
      wrapper.setState({ suggestions: buildSuggestions(5), showSuggestions: true, suggestionFocus: 3 });

      wrapper.instance().fetchSuggestions('sugg');
      // the component debounces the suggestions call by 200 ms
      await wait(300);

      expect(wrapper.state('suggestions').length).toEqual(2);
      expect(wrapper.state('suggestionFocus')).toEqual(null);
    });
  });
});
