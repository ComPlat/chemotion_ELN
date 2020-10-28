import _ from 'lodash';

import alt from '../alt';
import UIFetcher from '../fetchers/UIFetcher';
import PredictionsFetcher from '../fetchers/PredictionsFetcher';

class PredictionActions {
  infer(targets, template) { // eslint-disable-line class-methods-use-this
    const smis = targets.map(t => t.molecule_cano_smiles);
    const target = { smis };

    return (dispatch) => {
      PredictionsFetcher
        .fetchInfer(target, template)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateActiveKey(key) { // eslint-disable-line class-methods-use-this
    return key;
  }

  updateTemplate(template) { // eslint-disable-line class-methods-use-this
    return template;
  }

  updateUI(combState) { // eslint-disable-line class-methods-use-this
    const { uiState, predictionState } = combState;
    const { sample, currentCollection } = uiState;
    const { inputEls, defaultEls } = predictionState;
    const sampleMemoryIds = inputEls ? inputEls.map(e => e.id) : [];
    const sampleDefaultIds = defaultEls ? defaultEls.map(e => e.id) : [];
    const sampleCheckedIds = sample.checkedIds.toArray();
    const dfSIds = _.difference(sampleCheckedIds, sampleMemoryIds)
      .filter(id => !sampleDefaultIds.includes(id));

    const elementAdded = dfSIds.length > 0 || sample.checkedAll;
    const elementSubs = _.difference(sampleMemoryIds, sampleCheckedIds).length > 0;
    const selectedTags = { sampleIds: [...sampleMemoryIds], reactionIds: [] };

    if (elementAdded) {
      return (dispatch) => {
        UIFetcher.loadReport(
          {
            sample, reaction: {}, currentCollection, selectedTags,
          },
          'lists',
        ).then((rsp) => {
          const newSpls = rsp.samples.filter(x => !x.in_browser_memory);
          const allSpls = [...newSpls, ...inputEls, ...defaultEls];
          const result = { samples: allSpls };
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
      };
    } else if (elementSubs) {
      return (dispatch) => {
        const inpSpls = inputEls.filter(e => sampleCheckedIds.indexOf(e.id) >= 0);
        const allSpls = [...defaultEls, ...inpSpls];
        const result = { samples: allSpls };
        dispatch(result);
      };
    }
    return (dispatch) => {
      dispatch(false);
    };
  }

  remove(el) { // eslint-disable-line class-methods-use-this
    return el;
  }

  reset() { // eslint-disable-line class-methods-use-this
    return null;
  }
}

export default alt.createActions(PredictionActions);
