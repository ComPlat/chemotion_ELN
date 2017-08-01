import alt from '../alt'
import ReportActions from '../actions/ReportActions'
import ElementStore from '../stores/ElementStore';
import Utils from '../utils/Functions'
import ArrayUtils from '../utils/ArrayUtils';
import UpdateSelectedObjs from './common/UpdateSelectedObjs';

class ReportStore {
  constructor() {
    this.splSettings = [ {text: "diagram", checked: true},
                          {text: "collection", checked: true},
                          {text: "analyses", checked: true},
                          {text: "reaction description", checked: true} ]
    this.rxnSettings = [ {text: "diagram", checked: true},
                          {text: "material", checked: true},
                          {text: "description", checked: true},
                          {text: "purification", checked: true},
                          {text: "tlc", checked: true},
                          {text: "observation", checked: true},
                          {text: "analysis", checked: true},
                          {text: "literature", checked: true} ]
    this.configs = [ {text: "Page Break", checked: true},
                     {text: "Show all chemicals in schemes (unchecked to show products only)", checked: true} ]
    this.checkedAllSplSettings = true
    this.checkedAllRxnSettings = true
    this.checkedAllConfigs = true
    this.processingReport = false
    this.selectedObjTags = { sampleIds: [], reactionIds: [] }
    this.selectedObjs = []
    this.imgFormat = 'png'
    this.archives = []
    this.fileName = this.initFileName()
    this.fileDescription = ''
    this.activeKey = 0
    this.processings = []

    this.bindListeners({
      handleUpdateSplSettings: ReportActions.updateSplSettings,
      handleToggleSplSettingsCheckAll: ReportActions.toggleSplSettingsCheckAll,
      handleUpdateRxnSettings: ReportActions.updateRxnSettings,
      handleToggleRxnSettingsCheckAll: ReportActions.toggleRxnSettingsCheckAll,
      handleUpdateConfigs: ReportActions.updateConfigs,
      handleToggleConfigsCheckAll: ReportActions.toggleConfigsCheckAll,
      handleGenerateReport: ReportActions.generateReport,
      handleUpdateCheckedTags: ReportActions.updateCheckedTags,
      handleMove: ReportActions.move,
      handleUpdateImgFormat: ReportActions.updateImgFormat,
      handleGetArchives: ReportActions.getArchives,
      handleUpdateFileName: ReportActions.updateFileName,
      handleUpdateFileDescription: ReportActions.updateFileDescription,
      handleUpdateActiveKey: ReportActions.updateActiveKey,
      handleDownloadReport: ReportActions.downloadReport,
      handleUpdateProcessQueue: ReportActions.updateProcessQueue,
    })
  }

  handleUpdateImgFormat(value) {
    this.setState({ imgFormat: value })
  }

  handleUpdateSplSettings(target) {
    this.setState({
      splSettings: this.splSettings.map( s => {
        if(s.text === target.text) {
          return Object.assign({}, s, {checked: !target.checked})
        }
        return s
      })
    })
  }

  handleToggleSplSettingsCheckAll() {
    const newCheckValue = !this.checkedAllSplSettings
    this.setState({
      splSettings: this.splSettings.map( s => {
        return Object.assign({}, s, {checked: newCheckValue})
      }),
      checkedAllSplSettings: newCheckValue
    })
  }

  handleUpdateRxnSettings(target) {
    this.setState({
      rxnSettings: this.rxnSettings.map( s => {
        if(s.text === target.text) {
          return Object.assign({}, s, {checked: !target.checked})
        }
        return s
      })
    })
  }

  handleToggleRxnSettingsCheckAll() {
    const newCheckValue = !this.checkedAllRxnSettings
    this.setState({
      rxnSettings: this.rxnSettings.map( s => {
        return Object.assign({}, s, {checked: newCheckValue})
      }),
      checkedAllRxnSettings: newCheckValue
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

  handleGenerateReport(result) {
    const newArchives = [result.report, ...this.archives];
    this.setState({ processingReport: !this.processingReport,
                    activeKey: 5,
                    archives: newArchives,
                    processings: this.getProcessings(newArchives),
                    fileName: this.initFileName() });
    this.loadingIcon();
  }

  getProcessings(archives) {
    let ids = [];
    archives.forEach( a => {
      if(!a.downloadable) {
        ids = [...ids, a.id];
      }
    });
    return ids;
  }

  loadingIcon() {
    setTimeout(() => this.setState({processingReport: false}), 2500);
  }

  handleUpdateCheckedTags({newTags, newObjs}) {
    this.setState({selectedObjTags: newTags});
    const newSelectedObjs = UpdateSelectedObjs(newTags,
                                                newObjs,
                                                this.selectedObjs);
    this.setState({selectedObjs: newSelectedObjs});
  }

  handleMove({sourceTag, targetTag}) {
    const sourceIndex = this.findIndexFromObjs(sourceTag);
    const targetIndex = this.findIndexFromObjs(targetTag);
    const indexOne = sourceIndex > targetIndex ? targetIndex : sourceIndex;
    const indexTwo = sourceIndex > targetIndex ? sourceIndex : targetIndex;
    const objs = this.selectedObjs || [];

    const newObjs = [ ...objs.slice(0, indexOne),
                      objs[indexTwo],
                      ...objs.slice(indexOne + 1, indexTwo),
                      objs[indexOne],
                      ...objs.slice(indexTwo + 1) ].filter(obj => obj != null) || [];
    this.setState({selectedObjs: newObjs});
  }

  findIndexFromObjs(tag) {
    let objIndex;
    const objs = this.selectedObjs || [];
    objs.forEach( (obj, i) => {
      if(obj.type === tag.type && obj.id === tag.id) {
        objIndex = i;
      }
    });
    return objIndex;
  }

  initFileName() {
    const dt = new Date();
    const datetime =  dt.getFullYear() + "-"
                        + (dt.getMonth()+1)  + "-"
                        + dt.getDate() + "H"
                        + dt.getHours() + "M"
                        + dt.getMinutes() + "S"
                        + dt.getSeconds();
    return "ELN_Report_" + datetime;
  }

  handleGetArchives({archives}) {
    this.setState({archives: archives});
  }

  handleUpdateFileName(value) {
    const validValue = this.validName(value);
    this.setState({fileName: validValue});
  }

  validName(text) {
    if(text.length > 40) {
      text = text.substring(0, 40);
    }
    text = text.replace(/[^a-zA-Z0-9\-\_]/g, '');
    return text;
  }

  handleUpdateFileDescription(value) {
    this.setState({fileDescription: value});
  }

  handleUpdateActiveKey(key) {
    this.setState({activeKey: key});
  }

  handleDownloadReport(id) {
    this.markReaded(id);
    Utils.downloadFile({
      contents: "api/v1/download_report/docx?id=" + JSON.stringify(id),
    })
  }

  markReaded(id) {
    const newArchives = this.archives.map(archive => {
      if(archive.id === id) {
        archive.unread = false;
      }
      return archive;
    });
    this.setState({ archives: newArchives });
  }

  handleUpdateProcessQueue(result) {
    const updatedArchives = result.archives;
    const updatedIds = updatedArchives.map(a => a.id);
    const newProcessings = this.processings.filter(x => updatedIds.indexOf(x) === -1);
    const newArchives = this.archives.map(a => {
      const index = updatedIds.indexOf(a.id);
      return index === -1 ? a : updatedArchives[index];
    });
    this.setState({ archives: newArchives,
                    processings: newProcessings });
  }
}

export default alt.createStore(ReportStore, 'ReportStore');
