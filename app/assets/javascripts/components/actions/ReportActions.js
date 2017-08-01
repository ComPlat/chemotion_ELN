import alt from '../alt';
import GeneralFetcher from '../fetchers/GeneralFetcher';
import ReportsFetcher from '../fetchers/ReportsFetcher';
import _ from 'lodash';

class ReportActions {

  updateImgFormat(value) {
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

  updateCheckedTags(oldTags, newTags) {
    const diffTags = {  sample: _.difference(newTags.sampleIds, oldTags.sampleIds),
                        reaction: _.difference(newTags.reactionIds, oldTags.reactionIds) };
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

  updateFileName(value) {
    return value;
  }

  updateFileDescription(value) {
    return value;
  }

  updateActiveKey(key) {
    return key;
  }

  downloadReport(id) {
    return id;
  }
}

export default alt.createActions(ReportActions);
