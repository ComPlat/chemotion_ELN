import alt from '../alt'
import ReportActions from '../actions/ReportActions'
import Utils from '../utils/Functions'

class ReportStore {
  constructor() {
    this.settings = [ {text: "formula", checked: true},
  	                  {text: "material", checked: true},
  	                  {text: "description", checked: true},
                      {text: "purification", checked: true},
                      {text: "tlc", checked: true},
                      {text: "observation", checked: true},
                      {text: "analysis", checked: true},
  	                  {text: "literature", checked: true} ]
    this.configs = [ {text: "Page Break", checked: true} ]
    this.checkedAllSettings = true
    this.checkedAllConfigs = true
    this.processingReport = false

    this.bindListeners({
      handleUpdateSettings: ReportActions.updateSettings,
      handleToggleSettingsCheckAll: ReportActions.toggleSettingsCheckAll,
      handleUpdateConfigs: ReportActions.updateConfigs,
      handleToggleConfigsCheckAll: ReportActions.toggleConfigsCheckAll,
      handleGenerateReports: ReportActions.generateReports
    })
  }

  handleUpdateSettings(target) {
    this.setState({
      settings: this.settings.map( s => {
        if(s.text === target.text) {
          return Object.assign({}, s, {checked: !target.checked})
        }
        return s
      })
    })
  }

  handleToggleSettingsCheckAll() {
    const newCheckValue = !this.checkedAllSettings
    this.setState({
      settings: this.settings.map( s => {
        return Object.assign({}, s, {checked: newCheckValue})
      }),
      checkedAllSettings: newCheckValue
    })
  }

  handleUpdateConfigs(target) {
    this.setState({
      configs: this.configs.map( s => {
        if(s.text === target.text) {
          return Object.assign({}, s, {checked: !target.checked})
        }
        return s
      })
    })
  }

  handleToggleConfigsCheckAll() {
    const newCheckValue = !this.checkedAllConfigs
    this.setState({
      configs: this.configs.map( s => {
        return Object.assign({}, s, {checked: newCheckValue})
      }),
      checkedAllConfigs: newCheckValue
    })
  }

  handleGenerateReports(ids) {
    const settings = this.chainedItems(this.settings)
    const configs = this.chainedItems(this.configs)
    this.spinnerProcess()
    Utils.downloadFile({
      contents: "api/v1/multiple_reports/docx?ids=" + ids
                + "&settings=" + settings + "&configs=" + configs,
      name: "ELN-report_" + new Date().toISOString().slice(0,19)
    })
  }

  spinnerProcess() {
    this.setState({processingReport: !this.processingReport})
    setTimeout(() => this.setState({processingReport: false}), 2500)
  }

  chainedItems(items) {
    return items.map(item => {
      return item.checked
        ? item.text.replace(/\s+/g, '').toLowerCase()
        : null
    }).filter(r => r!=null).join('_')
  }
}

export default alt.createStore(ReportStore, 'ReportStore')
