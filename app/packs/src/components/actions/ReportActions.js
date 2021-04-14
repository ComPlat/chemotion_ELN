import alt from '../alt';
import UIFetcher from '../fetchers/UIFetcher';
import ReportsFetcher from '../fetchers/ReportsFetcher';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';
import _ from 'lodash';
import { GetTypeIds, LoadPreviewIds } from '../utils/ReportHelper';

class ReportActions {

  updateImgFormat(value) {
    return value;
  }

  updateTemplate(value) {
    return value;
  }

  updateSplSettings(target) {
    return target;
  }

  toggleSplSettingsCheckAll() {
    return null;
  }

  updateRxnSettings(target) {
    return target;
  }

  toggleRxnSettingsCheckAll() {
    return null;
  }

  updateSiRxnSettings(target) {
    return target;
  }

  toggleSiRxnSettingsCheckAll() {
    return null;
  }

  updateConfigs(target) {
    return target;
  }

  toggleConfigsCheckAll() {
    return null;
  }

  generateReport(report) {
    return (dispatch) => { ReportsFetcher.create(report)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  //
  updateDefaultTags(dTags) {
    return dTags;
  }

  move({sourceTag, targetTag}) {
    return {sourceTag, targetTag};
  }

  getArchives() {
    return (dispatch) => { ReportsFetcher.fetchArchives()
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  updateProcessQueue(oriQueue) {
    return (dispatch) => { ReportsFetcher.fetchDownloadable(oriQueue)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  updateFileName(e) {
    return e.target.value;
  }

  updateFileDescription(e) {
    return e.target.value;
  }

  updateActiveKey(key) {
    return key;
  }

  downloadReport(id, template) {
    return { id, template };
  }

  clone(archive) {
    const sampleIds = GetTypeIds(archive.objects, 'sample')
    const reactionIds = GetTypeIds(archive.objects, 'reaction')
    const uiState = {
      sample: { checkedIds: sampleIds },
      reaction: { checkedIds: reactionIds },
    };
    return (dispatch) => {
      UIFetcher.loadReport(uiState, 'lists')
        .then((result) => {
          dispatch({ objs: result, archive, defaultObjTags: { sampleIds, reactionIds } });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  delete(archive) {
    return (dispatch) => {
      ReportsFetcher.deleteArchive(archive.id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  remove(target) {
    return target;
  }

  reset() {
    return null;
  }

  updMSVal(moleculeId, value) {
    return { moleculeId, value };
  }

  updateThumbNails(attIds) {
    return (dispatch) => {
      AttachmentFetcher.fetchThumbnails(attIds)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateCheckedTags({ uiState, reportState }) {
    const { sample, reaction, currentCollection } = uiState;
    const { selectedObjTags, defaultObjTags } = reportState;
    const sampleCheckedIds = sample.checkedIds.toArray();
    const reactionCheckedIds = reaction.checkedIds.toArray();
    const { sampleIds, reactionIds } = selectedObjTags;
    const dfSIds = _.difference(sampleCheckedIds, sampleIds)
      .filter(id => !defaultObjTags.sampleIds.includes(id));
    const dfRIds = _.difference(reactionCheckedIds, reactionIds)
      .filter(id => !defaultObjTags.reactionIds.includes(id));

    // const diffTags = { sample: dfSIds, reaction: dfRIds };

    const elementAdded = dfSIds.length > 0 || dfRIds.length > 0
      || sample.checkedAll || reaction.checkedAll;

    const elementSubs = _.difference(sampleIds, sampleCheckedIds).length > 0
      || _.difference(reactionIds, reactionCheckedIds).length > 0;

    if (elementAdded) {
      return (dispatch) => {
        UIFetcher.loadReport({
          sample, reaction, currentCollection, selectedTags: selectedObjTags, },
          'lists',
        ).then((result) => {
            const newTags = {
              sampleIds: result.samples.map(e => e.id),
              reactionIds: result.reactions.map(e => e.id)
            };
            dispatch({ newTags, newObjs: result });
          }).catch((errorMessage) => {
            console.log(errorMessage);
          });
      };
    } else if (elementSubs) {
      return (dispatch) => {
        const newTags = {
          sampleIds: sampleCheckedIds,
          reactionIds: reactionCheckedIds
        };
        const result = { samples: [], reactions: [] };
        dispatch({ newTags, newObjs: result });
      };
    }
    return (dispatch) => {
      dispatch({ newTags: false, newObjs: false });
    };
  }

  loadRreview({ reportState }) {
    const state = LoadPreviewIds(reportState);
    return (dispatch) => {
      UIFetcher.loadReport(state, 'elements')
        .then((result) => {
          dispatch({ objs: result });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
}

export default alt.createActions(ReportActions);
