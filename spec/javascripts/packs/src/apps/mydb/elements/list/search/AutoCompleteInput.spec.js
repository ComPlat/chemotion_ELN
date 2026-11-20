import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { ListGroup } from 'react-bootstrap';
import AutoCompleteInput from 'src/apps/mydb/elements/list/search/AutoCompleteInput';
import UIStore from 'src/stores/alt/stores/UIStore';

configure({ adapter: new Adapter() });

const TYPING_DELAY = 600; // AutoCompleteInput#timeout
const DEBOUNCE = 200; // debounce in AutoCompleteInput#fetchSuggestions
const DOWN = 40;
const UP = 38;

const buildSuggestions = (count, prefix = 'suggestion') => Array.from({ length: count }, (_, i) => ({
  name: `${prefix} ${i}`,
  search_by_method: 'sample_name',
}));

const activeIndexes = (wrapper) => wrapper.update().find(ListGroup.Item)
  .map((item, index) => (item.prop('active') ? index : null))
  .filter((index) => index !== null);

const keyDown = (keyCode) => ({ keyCode, preventDefault: () => {} });

// setImmediate is not faked, so this lets resolved promises run their callbacks
const flush = () => new Promise((resolve) => { setImmediate(resolve); });

// a suggestions request the spec resolves by hand
const deferred = () => {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
};

describe('AutoCompleteInput', () => {
  let wrapper;
  let clock;

  const mountWith = (suggestionsFn = () => Promise.resolve([])) => {
    wrapper = mount(<AutoCompleteInput suggestions={suggestionsFn} />);
    return wrapper;
  };

  const showList = (count, extra = {}) => {
    wrapper.setState({ suggestions: buildSuggestions(count), showSuggestions: true, ...extra });
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    if (wrapper) wrapper.unmount();
    wrapper = null;
    clock.restore();
  });

  describe('focusSuggestion', () => {
    it('focuses an entry after the suggestion list got shorter', () => {
      mountWith();
      showList(5);
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
      showList(3);
      wrapper.instance().focusSuggestion(1);
      wrapper.instance().focusSuggestion(2);

      expect(activeIndexes(wrapper)).toEqual([2]);
    });

    it('ignores an index that is not in the current list', () => {
      mountWith();
      showList(2, { suggestionFocus: 1 });

      expect(() => wrapper.instance().focusSuggestion(7)).not.toThrow();
      expect(wrapper.state('suggestionFocus')).toEqual(1);
    });

    it('cancels the typed-text fetch that has not started yet', () => {
      const suggestionsFn = sinon.stub().resolves(buildSuggestions(3, 'new'));
      mountWith(suggestionsFn);
      showList(3);

      wrapper.instance().handleValueChange({ target: { value: 'sugg' } }, wrapper.instance().doneTyping);
      wrapper.instance().handleKeyDown(keyDown(DOWN));
      clock.tick(TYPING_DELAY + DEBOUNCE);

      expect(suggestionsFn.called).toBe(false);
      expect(wrapper.state('suggestionFocus')).toEqual(0);
      expect(wrapper.state('value')).toEqual('suggestion 0');
    });

    it('ignores a response that arrives after the user started navigating', async () => {
      const request = deferred();
      const suggestionsFn = sinon.stub().returns(request.promise);
      mountWith(suggestionsFn);
      showList(3);

      wrapper.instance().handleValueChange({ target: { value: 'sugg' } }, wrapper.instance().doneTyping);
      clock.tick(TYPING_DELAY + DEBOUNCE);
      expect(suggestionsFn.calledOnce).toBe(true); // request in flight

      wrapper.instance().handleKeyDown(keyDown(DOWN));
      request.resolve(buildSuggestions(5, 'new'));
      await flush();

      expect(wrapper.state('suggestions')[0].name).toEqual('suggestion 0');
      expect(wrapper.state('suggestionFocus')).toEqual(0);
    });
  });

  describe('fetchSuggestions', () => {
    it('clears the focus when a new result list arrives', async () => {
      mountWith(() => Promise.resolve(buildSuggestions(2)));
      showList(5, { suggestionFocus: 3 });

      wrapper.instance().fetchSuggestions('sugg');
      clock.tick(DEBOUNCE);
      await flush();

      expect(wrapper.state('suggestions').length).toEqual(2);
      expect(wrapper.state('suggestionFocus')).toEqual(null);
    });

    it('keeps the latest result when an older request answers last', async () => {
      const first = deferred();
      const second = deferred();
      mountWith(sinon.stub().onFirstCall().returns(first.promise).onSecondCall()
        .returns(second.promise));

      wrapper.instance().fetchSuggestions('su');
      wrapper.instance().fetchSuggestions('sugg');
      clock.tick(DEBOUNCE);

      second.resolve(buildSuggestions(2, 'latest'));
      await flush();
      first.resolve(buildSuggestions(5, 'older'));
      await flush();

      expect(wrapper.state('suggestions').map((s) => s.name)).toEqual(['latest 0', 'latest 1']);
    });
  });

  describe('keyboard navigation', () => {
    it('starts at the first entry on Down and at the last one on Up', () => {
      mountWith();
      showList(5);
      wrapper.instance().handleKeyDown(keyDown(DOWN));
      expect(wrapper.state('suggestionFocus')).toEqual(0);

      wrapper.setState({ suggestionFocus: null, valueBeforeFocus: null });
      wrapper.instance().handleKeyDown(keyDown(UP));
      expect(wrapper.state('suggestionFocus')).toEqual(4);
    });

    it('wraps around at both ends', () => {
      mountWith();
      showList(3, { suggestionFocus: 2 });
      wrapper.instance().handleKeyDown(keyDown(DOWN));
      expect(wrapper.state('suggestionFocus')).toEqual(0);

      wrapper.instance().handleKeyDown(keyDown(UP));
      expect(wrapper.state('suggestionFocus')).toEqual(2);
    });

    it('works again after an empty result was followed by results', async () => {
      mountWith(() => Promise.resolve(buildSuggestions(2)));
      wrapper.setState({ error: 'Nothing was found.', suggestions: null });

      wrapper.instance().fetchSuggestions('sugg');
      clock.tick(DEBOUNCE);
      await flush();
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

    it('does not update state from a response that arrives after unmount', async () => {
      const request = deferred();
      mountWith(sinon.stub().returns(request.promise));
      const instance = wrapper.instance();
      const setState = sinon.spy(instance, 'setState');

      instance.fetchSuggestions('sugg');
      clock.tick(DEBOUNCE);
      wrapper.unmount();
      wrapper = null;
      request.resolve(buildSuggestions(2));
      await flush();

      expect(setState.called).toBe(false);
    });
  });
});
