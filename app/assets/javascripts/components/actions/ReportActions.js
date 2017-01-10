import alt from '../alt';

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

  generateReports() {
    return null;
  }

  updateCheckedTags(tags) {
    return tags;
  }

  move({sourceTag, targetTag}) {
    return {sourceTag, targetTag};
  }
}

export default alt.createActions(ReportActions);
