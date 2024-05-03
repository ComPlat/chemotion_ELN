import _ from 'lodash';
import alt from 'src/stores/alt/alt';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ReportsFetcher from 'src/fetchers/ReportsFetcher';
import ReportTemplateFetcher from 'src/fetchers/ReportTemplateFetcher';
import UIFetcher from 'src/fetchers/UIFetcher';
import { GetTypeIds, LoadPreviewIds } from 'src/utilities/ReportHelper';

class ReportActions {
  updateImgFormat = value => value
  updateTemplate = value => value

  updateSplSettings = target => target
  toggleSplSettingsCheckAll = () => null

  updateRxnSettings = target => target
  toggleRxnSettingsCheckAll = () => null

  updateSiRxnSettings = target => target
  toggleSiRxnSettingsCheckAll = () => null

  updateConfigs = target => target
  toggleConfigsCheckAll = () => null

  generateReport = report => (dispatch) => {
    ReportsFetcher.create(report)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateDefaultTags = dTags => dTags
  move = ({ sourceTag, targetTag }) => ({ sourceTag, targetTag })

  getArchives = () => (dispatch) => {
    ReportsFetcher.fetchArchives()
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateProcessQueue = oriQueue => (dispatch) => {
    ReportsFetcher.fetchDownloadable(oriQueue)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateFileName = e => e.target.value
  updateFileDescription = e => e.target.value
  updateActiveKey = key => key
  downloadReport = (id, template) => ({ id, template })

  clone = (archive) => {
    const sampleIds = GetTypeIds(archive.objects, 'sample');
    const reactionIds = GetTypeIds(archive.objects, 'reaction');
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

  delete = archive => (dispatch) => {
    ReportsFetcher.deleteArchive(archive.id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  remove = target => target
  reset = () => null
  updMSVal = (moleculeId, value) => ({ moleculeId, value })

  updateThumbNails = attIds => (dispatch) => {
    AttachmentFetcher.fetchThumbnails(attIds)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchTemplates = () => (dispatch) => {
    ReportTemplateFetcher.fetchTemplates()
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateCheckedTags = ({ uiState, reportState }) => {
    const { sample, reaction, currentCollection } = uiState;
    const { selectedObjTags, defaultObjTags } = reportState;
    const sampleCheckedIds = sample.checkedIds.toArray();
    const reactionCheckedIds = reaction.checkedIds.toArray();
    const { sampleIds, reactionIds } = selectedObjTags;
    const dfSIds = _.difference(sampleCheckedIds, sampleIds)
      .filter(id => !defaultObjTags.sampleIds.includes(id));
    const dfRIds = _.difference(reactionCheckedIds, reactionIds)
      .filter(id => !defaultObjTags.reactionIds.includes(id));

    const elementAdded = dfSIds.length > 0 || dfRIds.length > 0
      || sample.checkedAll || reaction.checkedAll;

    const elementSubs = _.difference(sampleIds, sampleCheckedIds).length > 0
      || _.difference(reactionIds, reactionCheckedIds).length > 0;

    if (elementAdded) {
      return (dispatch) => {
        UIFetcher.loadReport(
          {
            sample, reaction, currentCollection, selectedTags: selectedObjTags,
          },
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

  loadReview = ({ reportState }) => {
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
