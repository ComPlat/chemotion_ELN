import alt from '../alt';
import GeneralFetcher from '../fetchers/GeneralFetcher';
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

  updateCheckedTags(oldTags, newTags, defaultTags) {
    let dfSIds = _.difference(newTags.sampleIds, oldTags.sampleIds);
    let dfRIds = _.difference(newTags.reactionIds, oldTags.reactionIds);
    dfSIds = dfSIds.filter(id => !defaultTags.sampleIds.includes(id));
    dfRIds = dfRIds.filter(id => !defaultTags.reactionIds.includes(id));
    const diffTags = { sample: dfSIds, reaction: dfRIds };
    return (dispatch) => { GeneralFetcher.fetchListContent(diffTags)
      .then((result) => {
        dispatch({newTags: newTags, newObjs: result});
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
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

  downloadReport(id) {
    return id;
  }

  clone(archive) {
    const tags = {
      sample: GetTypeIds(archive.objects, 'sample'),
      reaction: GetTypeIds(archive.objects, 'reaction'),
    };
    return (dispatch) => {
      GeneralFetcher.fetchListContent(tags)
        .then((result) => {
          dispatch({ objs: result, archive, tags });
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
