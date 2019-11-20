import alt from '../alt';
import UIFetcher from '../fetchers/UIFetcher';
import ReportsFetcher from '../fetchers/ReportsFetcher';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';
import _ from 'lodash';
import { GetTypeIds } from '../utils/ReportHelper';

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

  updateCheckedTags(uiState) {
    return uiState;
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
      UIFetcher.loadReportElements(uiState)
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
}

export default alt.createActions(ReportActions);
