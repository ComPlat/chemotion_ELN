import alt from '../alt';
import ReportActions from '../actions/ReportActions';

class ReportStore {
  constructor() {
    this.settings = [ {text: "formula", checked: true},
  	                  {text: "material", checked: true},
  	                  {text: "description", checked: true},
                      {text: "purification", checked: true},
                      {text: "tlc", checked: true},
                      {text: "observation", checked: true},
                      {text: "analysis", checked: true},
  	                  {text: "literature", checked: true} ];
    this.configs = [ {text: "Page Break", checked: true} ];
    this.selectedReactionIds = [];
    this.selectedReactions = [];
    this.checkedAllSettings = true;
    this.checkedAllConfigs = true;

    this.bindListeners({
      handleUpdateSettings: ReportActions.updateSettings,
      handleToggleSettingsCheckAll: ReportActions.toggleSettingsCheckAll,
      handleUpdateConfigs: ReportActions.updateConfigs,
      handleToggleConfigsCheckAll: ReportActions.toggleConfigsCheckAll
    })
  }

  handleUpdateSettings(target) {
    this.setState({
      settings: this.settings.map( s => {
        if(s.text === target.text) {
          return Object.assign({}, s, {checked: !target.checked});
        }
        return s
      })
    })
  }

  handleToggleSettingsCheckAll() {
    const newCheckValue = !this.checkedAllSettings
    this.setState({
      settings: this.settings.map( s => {
        return Object.assign({}, s, {checked: newCheckValue});
      }),
      checkedAllSettings: newCheckValue
    })
  }

  handleUpdateConfigs(target) {
    this.setState({
      configs: this.configs.map( s => {
        if(s.text === target.text) {
          return Object.assign({}, s, {checked: !target.checked});
        }
        return s
      })
    })
  }

  handleToggleConfigsCheckAll() {
    const newCheckValue = !this.checkedAllConfigs
    this.setState({
      configs: this.configs.map( s => {
        return Object.assign({}, s, {checked: newCheckValue});
      }),
      checkedAllConfigs: newCheckValue
    })
  }
}

export default alt.createStore(ReportStore, 'ReportStore');
