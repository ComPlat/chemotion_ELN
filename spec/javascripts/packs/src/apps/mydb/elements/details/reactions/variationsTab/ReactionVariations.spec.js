import React from 'react';
import { mount, configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { act } from 'react-dom/test-utils';
import expect from 'expect';
import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import { setUpReaction } from 'helper/reactionVariationsHelpers';
import UserStore from 'src/stores/alt/stores/UserStore';
import ReactionVariations from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';

configure({ adapter: new Adapter() });

const STALE_SAMPLE_ID = '460341';

async function mountWithStaleVariationKey(reaction) {
  const staleEntry = cloneDeep(Object.values(reaction.variations[0].startingMaterials)[0]);
  reaction.variations = reaction.variations.map((row) => ({
    ...row,
    startingMaterials: { ...row.startingMaterials, [STALE_SAMPLE_ID]: staleEntry },
  }));
  const onReactionChange = sinon.spy();

  let wrapper;
  await act(async () => {
    wrapper = mount(<ReactionVariations reaction={reaction} onReactionChange={onReactionChange} />);
  });
  await act(async () => {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
  });

  wrapper.update();
  return { wrapper, onReactionChange };
}

describe('ReactionVariations', () => {
  let userStoreStub;

  beforeEach(() => {
    userStoreStub = sinon.stub(UserStore, 'getState').returns({ currentUser: { id: 7 }, segmentKlasses: [] });
  });

  afterEach(() => {
    userStoreStub.restore();
    localStorage.clear();
  });

  it('drops variation keys of materials the reaction no longer has', async () => {
    const reaction = await setUpReaction();
    reaction.is_new = false;
    const ownStartingMaterialIDs = reaction.starting_materials.map((material) => material.id.toString());

    const { wrapper, onReactionChange } = await mountWithStaleVariationKey(reaction);

    expect(wrapper.find('AgGridReact').exists()).toBe(true);
    expect(onReactionChange.called).toBe(true);
    reaction.variations.forEach((row) => {
      expect(Object.keys(row.startingMaterials)).toEqual(ownStartingMaterialIDs);
    });
    wrapper.unmount();
  });

  it('keeps the source sample keys of an unsaved copy for the backend to remap', async () => {
    const reaction = await setUpReaction();
    reaction.is_new = true;

    const { wrapper, onReactionChange } = await mountWithStaleVariationKey(reaction);

    expect(wrapper.text()).toContain('Save the reaction to enable the variations tab.');
    expect(onReactionChange.called).toBe(false);
    reaction.variations.forEach((row) => {
      expect(Object.keys(row.startingMaterials)).toContain(STALE_SAMPLE_ID);
    });
    wrapper.unmount();
  });
});
