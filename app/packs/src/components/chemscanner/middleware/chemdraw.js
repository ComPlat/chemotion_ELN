import * as types from '../actions/ActionTypes';
import { CALL_API } from './api';
import { extractReactionFromId } from '../utils';

const cleanUpPromise = (cddInstance, mdl) => {
  const loadPromise = new Promise((resolve) => {
    cddInstance.clear();
    cddInstance.loadMOL(mdl, (cdxml, err) => {
      if (!err) resolve(cdxml);
    });
  });

  return loadPromise.then(() => {
    const clean = cddInstance.g.instanceHub.commandLibrary.getOrCreate(356);
    const selectAll = cddInstance.g.instanceHub.commandLibrary.getOrCreate(54);
    selectAll.handleCommand();
    clean.handleCommand();

    return new Promise(resolve => cddInstance.getMOL(mol => resolve(mol)));
  });
};

export default store => next => (action) => {
  const { type } = action;
  if (type !== types.CLEAN_UP) return next(action);

  const molecules = store.getState().get('molecules');
  const reactions = store.getState().get('reactions');
  const cddInstance = store.getState().get('chemdrawInstance');

  let selectedMolecules = molecules.filter(m => m.get('selected') || false);
  let selectedReactions = reactions.filter(m => m.get('selected') || false);

  if (selectedMolecules.size === 0 && selectedReactions.size === 0) {
    selectedMolecules = molecules;
    selectedReactions = reactions;
  }

  const promiseChain = selectedMolecules.reduce((chain, m) => (
    chain.then((chainRes) => {
      const mdl = m.get('mdl');

      return cleanUpPromise(cddInstance, mdl).then((cleanedMdl) => {
        const id = m.get('id');
        chainRes.push({ mid: id, mdl: cleanedMdl });
        return chainRes;
      });
    })
  ), Promise.resolve([]));

  return selectedReactions.reduce((chain, r) => (
    ['reactants', 'reagents', 'products'].reduce((rChain, group) => {
      const groupMol = r.get(group) || [];
      const rId = r.get('id');

      return groupMol.reduce((gChain, m) => (
        gChain.then((chainRes) => {
          const mdl = m.get('mdl');

          return cleanUpPromise(cddInstance, mdl).then((cleanedMdl) => {
            const id = m.get('id');
            chainRes.push({
              rId, group, mid: id, mdl: cleanedMdl
            });
            return chainRes;
          });
        })
      ), rChain);
    }, chain)
  ), promiseChain).then((resArray) => {
    const molArray = [];
    const reactionArray = [];

    resArray.forEach((res) => {
      const {
        group, mdl, mid, rId
      } = res;

      if (!rId) {
        molArray.push(res);
        return;
      }

      const reaction = reactionArray.find(r => r.id === rId);
      if (reaction) {
        const molecule = reaction[group].find(m => m.id === mid);
        molecule.mdl = mdl;
      } else {
        const simpleReaction = extractReactionFromId(reactions, rId);
        const molecule = simpleReaction[group].find(m => m.id === mid);
        molecule.mdl = mdl;
        reactionArray.push(simpleReaction);
      }
    });

    return next({
      type,
      [CALL_API]: {
        endpoint: '/api/v1/chemscanner/svg/mdl',
        options: {
          credentials: 'same-origin',
          method: 'post',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ molecules: molArray, reactions: reactionArray })
        }
      }
    });
  });
};
