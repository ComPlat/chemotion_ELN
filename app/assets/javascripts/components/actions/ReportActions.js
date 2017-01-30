import alt from '../alt';
import ReportsFetcher from '../fetchers/ReportsFetcher';

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

  updateCheckedTags(tags) {
    return tags;
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
