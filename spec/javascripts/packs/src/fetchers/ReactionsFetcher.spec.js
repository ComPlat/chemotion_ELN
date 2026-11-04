/* global describe, it, beforeEach, afterEach */
import expect from 'expect';
import sinon from 'sinon';
import ApiClient from 'src/api_clients/ChemotionApiClient';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import Reaction from 'src/models/Reaction';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';
// Runtime dependencies are installed in the repository root.
/* eslint-disable import/no-extraneous-dependencies */
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import alt from 'src/stores/alt/alt';
/* eslint-enable import/no-extraneous-dependencies */

describe('ReactionsFetcher reaction save preservation', () => {
  let sandbox;
  let reaction;
  let put;
  let getStore;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    reaction = { id: 17, products: [], serialize: () => ({ id: 17, materials: { products: [] } }) };
    sandbox.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
    sandbox.stub(GenericElsFetcher, 'uploadGenericFiles').resolves();
    sandbox.stub(ReactionsFetcher, 'updateAnnotationsInReaction').resolves();
    sandbox.stub(ReactionsFetcher, 'reactionElement').returns(reaction);
    put = sandbox.stub(ApiClient, 'putJson').resolves({});
    getStore = sandbox.stub(alt, 'getStore').throws(new Error('Unexpected store lookup'));
  });

  afterEach(() => { sandbox.restore(); });

  it('builds the payload from explicit IDs without consulting open tabs', () => {
    const ids = Object.freeze([42, 43]);
    expect(ReactionsFetcher.reactionSavePayload(reaction, ids)).toEqual({
      id: 17, materials: { products: [] }, preserve_removed_sample_ids: [42, 43],
    });
    expect(ReactionsFetcher.reactionSavePayload(reaction).preserve_removed_sample_ids).toEqual([]);
    sinon.assert.notCalled(getStore);
  });

  it('sends the supplied preservation IDs in the reaction update request', async () => {
    const saved = await ReactionsFetcher.update(reaction, [42]);

    sinon.assert.calledOnceWithExactly(put, '/api/v1/reactions/17', { body: {
      id: 17, materials: { products: [] }, preserve_removed_sample_ids: [42],
    } });
    expect(saved).toBe(reaction);
    sinon.assert.notCalled(getStore);
  });

  it('defaults to no preserved samples when called without IDs', async () => {
    await ReactionsFetcher.update(reaction);

    expect(put.firstCall.args[1].body.preserve_removed_sample_ids).toEqual([]);
    sinon.assert.notCalled(getStore);
  });
});

describe('ReactionsFetcher background context loading', () => {
  let sandbox;
  let actions;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(ApiClient, 'getJson').resolves({ reaction: {
      id: 17, type: 'reaction', starting_materials: [], reactants: [], products: [], solvents: [],
    } });
    sandbox.stub(Reaction.prototype, 'findReactionVesselSizeCatalystMaterialValues')
      .returns({ vesselSize: 0.05, catalystMoles: 0.002 });
    sandbox.stub(Reaction.prototype, 'findWeightPercentageReferenceMaterial')
      .returns({ weightPercentageReference: 42, targetAmount: 5 });
    actions = [
      sandbox.stub(GasPhaseReactionActions, 'setReactionVesselSize'),
      sandbox.stub(GasPhaseReactionActions, 'setCatalystReferenceMole'),
      sandbox.stub(WeightPercentageReactionActions, 'setWeightPercentageReference'),
      sandbox.stub(WeightPercentageReactionActions, 'setTargetAmountWeightPercentageReference'),
    ];
  });

  afterEach(() => { sandbox.restore(); });

  it('loads context without changing active reaction stores', async () => {
    const reaction = await ReactionsFetcher.fetchById(17, { updateStores: false });

    expect(reaction).toBeInstanceOf(Reaction);
    expect(reaction.id).toBe(17);
    actions.forEach((action) => sinon.assert.notCalled(action));
  });

  it('still initializes stores when opening a reaction normally', async () => {
    await ReactionsFetcher.fetchById(17);

    [0.05, 0.002, 42, 5].forEach((value, index) => {
      sinon.assert.calledOnceWithExactly(actions[index], value);
    });
  });
});
