/* global describe, it, beforeEach, afterEach */
import expect from 'expect';
import sinon from 'sinon';
import ApiClient from 'src/api_clients/ChemotionApiClient';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import Reaction from 'src/models/Reaction';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';

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
