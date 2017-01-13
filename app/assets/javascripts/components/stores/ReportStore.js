import alt from '../alt'
import ReportActions from '../actions/ReportActions'
import ElementStore from '../stores/ElementStore';
import Utils from '../utils/Functions'
import ArrayUtils from '../utils/ArrayUtils';

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
                     {text: "Show all material in diagrams (unchecked to show Products only)", checked: true} ]
    this.checkedAllSplSettings = true
    this.checkedAllRxnSettings = true
    this.checkedAllConfigs = true
    this.processingReport = false
    this.selectedObjTags = { sampleIds: [], reactionIds: [] }
    this.selectedObjs = []
    this.imgFormat = 'png'

    this.bindListeners({
      handleUpdateSplSettings: ReportActions.updateSplSettings,
      handleToggleSplSettingsCheckAll: ReportActions.toggleSplSettingsCheckAll,
      handleUpdateRxnSettings: ReportActions.updateRxnSettings,
      handleToggleRxnSettingsCheckAll: ReportActions.toggleRxnSettingsCheckAll,
      handleUpdateConfigs: ReportActions.updateConfigs,
      handleToggleConfigsCheckAll: ReportActions.toggleConfigsCheckAll,
      handleGenerateReports: ReportActions.generateReports,
      handleUpdateCheckedTags: ReportActions.updateCheckedTags,
      handleMove: ReportActions.move,
      handleUpdateImgFormat: ReportActions.updateImgFormat
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

  handleGenerateReports() {
    const objTags = this.selectedObjs.map(obj => {
      return { id: obj.id, type: obj.type };
    });
    this.spinnerProcess();

    Utils.downloadFile({
      contents: "api/v1/multiple_reports/docx?objTags=" + JSON.stringify(objTags)
                + "&splSettings=" + JSON.stringify(this.abstractSplSettings())
                + "&rxnSettings=" + JSON.stringify(this.rxnSettings)
                + "&configs=" + JSON.stringify(this.abstractConfigs())
                + "&img_format=" + this.imgFormat,
      name: "ELN-report_" + new Date().toISOString().slice(0,19)
    })
  }

  abstractSplSettings() {
    return this.splSettings.map(obj => {
      return { text: obj.text.replace(" ", "_"), checked: obj.checked };
    });
  }

  abstractConfigs() {
    return this.configs.map(obj => {
      switch(obj.text) {
        case 'Page Break':
          return { text: "page_break", checked: obj.checked };
          break;
        case 'Show all material in diagrams (unchecked to show Products only)':
          if(obj.checked) {
            return { text: "whole_diagram", checked: obj.checked };
          } else {
            return { text: "product_diagram", checked: !obj.checked };
          }
          break;
        default:
          return obj;
      }
    });
  }

  spinnerProcess() {
    this.setState({processingReport: !this.processingReport})
    setTimeout(() => this.setState({processingReport: false}), 2500)
  }

  handleUpdateCheckedTags(tags) {
    this.setState({selectedObjTags: tags});
    this.setObjs();
  }

  setObjs() {
    const oriSelectedObjs = this.selectedObjs || [];
    const { sampleIds, reactionIds } = this.selectedObjTags;
    const samples = ArrayUtils.flatten2D(ElementStore.state.elements.samples.elements);
    const reactions = ElementStore.state.elements.reactions.elements;
    let selectedObjs = this.keepObjsAsIds(oriSelectedObjs, samples, sampleIds, 'sample');
    selectedObjs = this.keepObjsAsIds(selectedObjs, reactions, reactionIds, 'reaction');
    this.setState({selectedObjs: selectedObjs});
  }

  keepObjsAsIds(oriSelectedObjs, allElems, ids, type) {
    const allObjs = oriSelectedObjs.concat(allElems) || [];
    return allObjs.map( obj => {
      if(obj.type !== type){
        return obj;
      }
      if(obj.type === type && ids.indexOf(obj.id) !== -1){
        const index = ids.indexOf(obj.id);
        ids = [ ...ids.slice(0, index), ...ids.slice(index + 1) ]
        return obj;
      }
      return null;
    }).filter(obj => obj != null) || [];
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
}

export default alt.createStore(ReportStore, 'ReportStore');
