import alt from '../alt';

class ReportActions {
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
}

export default alt.createActions(ReportActions);
