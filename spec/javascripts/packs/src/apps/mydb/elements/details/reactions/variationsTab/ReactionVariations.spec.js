import React from 'react';
import { mount, configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { act } from 'react-dom/test-utils';
import expect from 'expect';
import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import { runInAction } from 'mobx';
import { protect, unprotect } from 'mobx-state-tree';
import { setUpReaction } from 'helper/reactionVariationsHelpers';
import { rootStore } from 'src/stores/mobx/RootStore';
import ReactionVariations from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';

configure({ adapter: new Adapter() });

// MST only allows changes through its own actions; unprotect lifts that,
// runInAction keeps MobX strict mode from warning about the direct assignment.
function setUserStore({ currentUser, segmentKlasses }) {
  unprotect(rootStore);
  runInAction(() => {
    rootStore.userStore.currentUser = currentUser;
    rootStore.userStore.segmentKlasses = segmentKlasses;
  });
  protect(rootStore);
}

// A sample id that none of the reaction's materials has.
const STALE_SAMPLE_ID = '999001';

function addStaleVariationKey(reaction) {
  const staleEntry = cloneDeep(Object.values(reaction.variations[0].startingMaterials)[0]);
  reaction.variations = reaction.variations.map((row) => ({
    ...row,
    startingMaterials: { ...row.startingMaterials, [STALE_SAMPLE_ID]: staleEntry },
  }));
}

async function mountReactionVariations(reaction, onReactionChange) {
  let wrapper;
  await act(async () => {
    wrapper = mount(<ReactionVariations reaction={reaction} onReactionChange={onReactionChange} />);
  });
  await act(async () => {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
  });
  wrapper.update();
  return wrapper;
}

describe('ReactionVariations', () => {
  let wrapper;

  beforeEach(() => {
    setUserStore({ currentUser: { id: 7 }, segmentKlasses: [] });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    setUserStore({ currentUser: null, segmentKlasses: [] });
    localStorage.clear();
  });

  it('opens a reaction with a variation key of a removed material without marking it as changed', async () => {
    const reaction = await setUpReaction();
    reaction.is_new = false;
    addStaleVariationKey(reaction);
    const storedVariations = cloneDeep(reaction.variations);
    const onReactionChange = sinon.spy();

    wrapper = await mountReactionVariations(reaction, onReactionChange);

    expect(wrapper.find('AgGridReact').exists()).toBe(true);
    expect(onReactionChange.called).toBe(false);
    // The stale key is only hidden; the backend drops it on the next save.
    expect(reaction.variations).toEqual(storedVariations);
  });

  it('hands the pruning of a removed segment to the parent, but not the hidden material key', async () => {
    const reaction = await setUpReaction();
    reaction.is_new = false;
    addStaleVariationKey(reaction);
    // No segment classes are available in this setup, so any segment column is a removed one.
    reaction.variations = reaction.variations.map((row) => ({
      ...row,
      segments: { ...(row.segments || {}), 'Removed segment': { value: 1 } },
    }));
    const onReactionChange = sinon.spy();

    wrapper = await mountReactionVariations(reaction, onReactionChange);

    expect(onReactionChange.calledOnce).toBe(true);
    reaction.variations.forEach((row) => {
      expect(Object.keys(row.segments || {})).not.toContain('Removed segment');
      expect(Object.keys(row.startingMaterials)).toContain(STALE_SAMPLE_ID);
    });
  });

  it('leaves the variations of an unsaved copy untouched', async () => {
    const reaction = await setUpReaction();
    reaction.is_new = true;
    addStaleVariationKey(reaction);
    const onReactionChange = sinon.spy();

    wrapper = await mountReactionVariations(reaction, onReactionChange);

    expect(wrapper.text()).toContain('Save the reaction to enable the variations tab.');
    expect(onReactionChange.called).toBe(false);
    reaction.variations.forEach((row) => {
      expect(Object.keys(row.startingMaterials)).toContain(STALE_SAMPLE_ID);
    });
  });
});
