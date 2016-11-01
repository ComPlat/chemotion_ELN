import alt from '../alt';

class ReportActions {

  updateImgFormat(value) {
    return value;
  }

  updateSettings(target) {
    return target;
  }

  toggleSettingsCheckAll() {
    return null;
  }

  updateConfigs(target) {
    return target;
  }

  toggleConfigsCheckAll() {
    return null;
  }

  generateReports() {
    return null;
  }

  updateCheckedIds(ids) {
    return ids;
  }

  move({sourceId, targetId}) {
    return {sourceId, targetId};
  }
}

export default alt.createActions(ReportActions);
