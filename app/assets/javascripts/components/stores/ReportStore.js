import alt from '../alt'
import ReportActions from '../actions/ReportActions'
import ElementStore from '../stores/ElementStore';
import Utils from '../utils/Functions'
import ArrayUtils from '../utils/ArrayUtils';
import { reOrderArr } from '../utils/DndControl';
import { UpdateSelectedObjs, GetTypeIds } from '../utils/ReportHelper';

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
    this.defaultObjTags = { sampleIds: [], reactionIds: [] }
    this.selectedObjTags = { sampleIds: [], reactionIds: [] }
    this.selectedObjs = []
    this.imgFormat = 'png'
    this.archives = []
    this.fileName = this.initFileName()
    this.fileDescription = ''
    this.activeKey = 0
    this.processings = []
    this.template = 'supporting_information'

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
      handleUpdateTemplate: ReportActions.updateTemplate,
      handleClone: ReportActions.clone,
      hadnleRemove: ReportActions.remove,
      hadnleReset: ReportActions.reset,
    })
  }

  handleUpdateImgFormat(value) {
    this.setState({ imgFormat: value })
  }

  handleUpdateTemplate(value) {
    this.setState({ template: value,
      fileName: this.initFileName(value),
      selectedObjs: this.orderObjsForTemplate(value) });
  }

  orderObjsForTemplate(template, oldObjs = null) {
    const oldSelectedObjs = oldObjs || this.selectedObjs;
    if(template === 'supporting_information') {
      let frontObjs = [], rearObjs = [];
      oldSelectedObjs.map(obj => {
        if(obj.type === 'reaction' && obj.role === 'gp') {
          frontObjs = [...frontObjs, obj];
        } else {
          rearObjs = [...rearObjs, obj];
        }
      });
      return [...frontObjs, ...rearObjs];
    }
    return oldSelectedObjs;
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
                    activeKey: 4,
                    archives: newArchives,
                    processings: this.getProcessings(newArchives),
                    fileName: this.initFileName(this.template) });
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
                                                this.defaultObjTags,
                                                this.selectedObjs);
    const finalObjs = this.orderObjsForTemplate(this.template, newSelectedObjs);
    this.setState({selectedObjs: finalObjs});
  }

  isEqTypeId(a, b) {
    return a.type === b.type && a.id === b.id;
  }

  handleMove({sourceTag, targetTag}) {
    const oldObjs = this.selectedObjs || [];
    const newObjs = reOrderArr(sourceTag, targetTag, this.isEqTypeId, oldObjs);
    const finalObjs = this.orderObjsForTemplate(this.template, newObjs);
    this.setState({selectedObjs: finalObjs});
  }

  initFileName(template = 'supporting_information') {
    let prefix = "Supporting_Information_";
    switch(template) {
      case "standard":
        prefix = "ELN_Report_";
        break;
      case "supporting_information":
        prefix = "Supporting_Information_";
        break;
    }

    const dt = new Date();
    const datetime =  dt.getFullYear() + "-"
                        + (dt.getMonth()+1)  + "-"
                        + dt.getDate() + "H"
                        + dt.getHours() + "M"
                        + dt.getMinutes() + "S"
                        + dt.getSeconds();
    return prefix + datetime;
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

  orderObjsForArchive(objs, order) {
    return order.map(od => objs.find(obj => this.isEqTypeId(obj, od)))
      .filter(r => r != null);
  }

  handleClone(result) {
    const { objs, archive, tags } = result;
    const { template, file_description, img_format, configs } = archive;
    const ss = archive.sample_settings;
    const rs = archive.reaction_settings;
    const defaultObjTags = { sampleIds: tags.sample,
      reactionIds: tags.reaction };
    const newObjs = UpdateSelectedObjs(defaultObjTags, objs, defaultObjTags);
    const orderedArObjs = this.orderObjsForArchive(newObjs, archive.objects);
    const orderedArTpObjs = this.orderObjsForTemplate(template, orderedArObjs);

    this.setState({
      activeKey: 0,
      template,
      fileDescription: file_description,
      fileName: this.initFileName(template),
      imgFormat: img_format,
      checkedAllSplSettings: false,
      checkedAllRxnSettings: false,
      checkedAllConfigs: false,
      splSettings:
        [
          { text: 'diagram', checked: ss.diagram },
          { text: 'collection', checked: ss.collection },
          { text: 'analyses', checked: ss.analyses },
          { text: 'reaction description', checked: ss.reaction_description },
        ],
      rxnSettings:
        [
          { text: 'diagram', checked: rs.diagram },
          { text: 'material', checked: rs.material },
          { text: 'description', checked: rs.description },
          { text: 'purification', checked: rs.purification },
          { text: 'tlc', checked: rs.tlc },
          { text: 'observation', checked: rs.observation },
          { text: 'analysis', checked: rs.analysis },
          { text: 'literature', checked: rs.literature },
        ],
      configs:
        [
          { text: 'Page Break', checked: configs.page_break },
          { text: 'Show all chemicals in schemes (unchecked to show products only)', checked: configs.page_break },
        ],
      defaultObjTags,
      selectedObjTags: { sampleIds: [], reactionIds: [] },
      selectedObjs: orderedArTpObjs,
    });
  }

  hadnleRemove(target) {
    let dTags = this.defaultObjTags;
    let sTags = this.selectedObjTags;
    const currentObjs = this.selectedObjs;
    if (target.type === 'sample') {
      const tmpSDTags = dTags.sampleIds.filter(e => e !== target.id);
      const tmpSSTags = sTags.sampleIds.filter(e => e !== target.id);
      dTags = { sampleIds: [...tmpSDTags, ...tmpSSTags],
        reactionIds: [...dTags.reactionIds, ...sTags.reactionIds] };
    } else if (target.type === 'reaction') {
      const tmpRDTags = dTags.reactionIds.filter(e => e !== target.id);
      const tmpRSTags = sTags.reactionIds.filter(e => e !== target.id);
      dTags = { sampleIds: [...dTags.sampleIds, ...sTags.sampleIds],
        reactionIds: [...tmpRDTags, ...tmpRSTags] };
    }
    dTags = { sampleIds: [...new Set(dTags.sampleIds)],
      reactionIds: [...new Set(dTags.reactionIds)] };
    sTags = { sampleIds: [], reactionIds: [] };
    const newObjs = UpdateSelectedObjs(sTags, currentObjs, dTags, currentObjs);
    const finalObjs = this.orderObjsForTemplate(this.template, newObjs);

    this.setState({
      defaultObjTags: dTags,
      selectedObjTags: sTags,
      selectedObjs: finalObjs,
    });
  }

  hadnleReset() {
    this.setState({
      activeKey: 0,
      template: 'supporting_information',
      fileDescription: '',
      fileName: this.initFileName(),
      imgFormat: 'png',
      checkedAllSplSettings: true,
      checkedAllRxnSettings: true,
      checkedAllConfigs: true,
      splSettings:
        [
          { text: 'diagram', checked: true },
          { text: 'collection', checked: true },
          { text: 'analyses', checked: true },
          { text: 'reaction description', checked: true },
        ],
      rxnSettings:
        [
          { text: 'diagram', checked: true },
          { text: 'material', checked: true },
          { text: 'description', checked: true },
          { text: 'purification', checked: true },
          { text: 'tlc', checked: true },
          { text: 'observation', checked: true },
          { text: 'analysis', checked: true },
          { text: 'literature', checked: true },
        ],
      configs:
        [
          { text: 'Page Break', checked: true },
          { text: 'Show all chemicals in schemes (unchecked to show products only)', checked: true },
        ],
      defaultObjTags: { sampleIds: [], reactionIds: [] },
      selectedObjTags: { sampleIds: [], reactionIds: [] },
      selectedObjs: [],
    });
  }
}

export default alt.createStore(ReportStore, 'ReportStore');
