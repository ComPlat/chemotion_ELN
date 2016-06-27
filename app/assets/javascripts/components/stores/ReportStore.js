import alt from '../alt';
import ReportActions from '../actions/ReportActions';

class ReportStore {
  constructor() {
    this.settings = [ {text: "description", checked: true},
  	                  {text: "reaction", checked: true},
  	                  {text: "material", checked: true},
                      {text: "properties", checked: true},
                      {text: "tlc-control", checked: true},
  	                  {text: "literature", checked: true} ];
    this.selectedReactionIds = [];
    this.selectedReactions = [];
    this.checkedAll = true;

    this.bindListeners({
      handleUpdateSettings: ReportActions.updateSettings,
      handleToggleSettingsCheckAll: ReportActions.toggleSettingsCheckAll
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
    const newCheckValue = !this.checkedAll
    this.setState({
      settings: this.settings.map( s => {
        return Object.assign({}, s, {checked: newCheckValue});
      }),
      checkedAll: newCheckValue
    })
  }
}

export default alt.createStore(ReportStore, 'ReportStore');
