import alt from '../alt';
import ReportActions from '../actions/ReportActions';
import Utils from '../utils/Functions';
import ArrayUtils from '../utils/ArrayUtils';
import { reOrderArr } from '../utils/DndControl';
import { UpdateSelectedObjs } from '../utils/ReportHelper';

class ReportStore {
  constructor() {
    this.splSettings = [
      { checked: true, text: 'diagram' },
      { checked: true, text: 'collection' },
      { checked: true, text: 'analyses' },
      { checked: true, text: 'reaction description' },
    ];
    this.rxnSettings = [
      { checked: true, text: 'diagram' },
      { checked: true, text: 'material' },
      { checked: true, text: 'description' },
      { checked: true, text: 'purification' },
      { checked: true, text: 'tlc' },
      { checked: true, text: 'observation' },
      { checked: true, text: 'analysis' },
      { checked: true, text: 'literature' },
    ];
    this.configs = [
      { checked: true, text: 'Page Break' },
      { checked: true, text: 'Show all chemicals in schemes (unchecked to show products only)' },
    ];
    this.checkedAllSplSettings = true;
    this.checkedAllRxnSettings = true;
    this.checkedAllConfigs = true;
    this.processingReport = false;
    this.defaultObjTags = { sampleIds: [], reactionIds: [] };
    this.selectedObjTags = { sampleIds: [], reactionIds: [] };
    this.selectedObjs = [];
    this.selMolSerials = [];
    this.imgFormat = 'png';
    this.archives = [];
    this.fileName = this.initFileName();
    this.fileDescription = '';
    this.activeKey = 0;
    this.processings = [];
    this.template = 'supporting_information';

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
      handleDelete: ReportActions.delete,
      hadnleRemove: ReportActions.remove,
      hadnleReset: ReportActions.reset,
      handleUpdMSVal: ReportActions.updMSVal,
    });
  }

  handleUpdateImgFormat(value) {
    this.setState({ imgFormat: value });
  }

  handleUpdateTemplate(value) {
    const newSelectedObjs = this.orderObjsForTemplate(value);
    const molSerials = this.updMolSerials(newSelectedObjs, value);
    this.setState({ template: value,
      fileName: this.initFileName(value),
      selectedObjs: newSelectedObjs,
      selMolSerials: molSerials,
    });
  }

  orderObjsForTemplate(template, oldObjs = null) {
    const oldSelectedObjs = oldObjs || this.selectedObjs;
    if (template === 'supporting_information') {
      let frontObjs = [];
      let rearObjs = [];
      oldSelectedObjs.forEach((obj) => {
        if (obj.type === 'reaction' && obj.role === 'gp') {
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
      splSettings: this.splSettings.map((s) => {
        if (s.text === target.text) {
          return Object.assign({}, s, { checked: !target.checked });
        }
        return s;
      }),
    });
  }

  handleToggleSplSettingsCheckAll() {
    const newCheckValue = !this.checkedAllSplSettings;
    this.setState({
      splSettings: this.splSettings.map(s => (
        Object.assign({}, s, { checked: newCheckValue })
      )),
      checkedAllSplSettings: newCheckValue,
    });
  }

  handleUpdateRxnSettings(target) {
    this.setState({
      rxnSettings: this.rxnSettings.map((s) => {
        if (s.text === target.text) {
          return Object.assign({}, s, { checked: !target.checked });
        }
        return s;
      }),
    });
  }

  handleToggleRxnSettingsCheckAll() {
    const newCheckValue = !this.checkedAllRxnSettings;
    this.setState({
      rxnSettings: this.rxnSettings.map(s => (
        Object.assign({}, s, { checked: newCheckValue })
      )),
      checkedAllRxnSettings: newCheckValue,
    });
  }

  handleUpdateConfigs(target) {
    this.setState({
      configs: this.configs.map((s) => {
        if (s.text === target.text) {
          return Object.assign({}, s, { checked: !target.checked });
        }
        return s;
      }),
    });
  }

  handleToggleConfigsCheckAll() {
    const newCheckValue = !this.checkedAllConfigs;
    this.setState({
      configs: this.configs.map(s => (
        Object.assign({}, s, { checked: newCheckValue })
      )),
      checkedAllConfigs: newCheckValue,
    });
  }

  handleGenerateReport(result) {
    const newArchives = [result.report, ...this.archives];
    this.setState({
      processingReport: !this.processingReport,
      activeKey: 5,
      archives: newArchives,
      processings: this.getProcessings(newArchives),
      fileName: this.initFileName(this.template),
    });
    this.loadingIcon();
  }

  getProcessings(archives) {
    let ids = [];
    archives.forEach((a) => {
      if (!a.downloadable) {
        ids = [...ids, a.id];
      }
    });
    return ids;
  }

  loadingIcon() {
    setTimeout(() => this.setState({
      processingReport: false,
    }), 2500);
  }

  handleUpdateCheckedTags({ newTags, newObjs }) {
    this.setState({ selectedObjTags: newTags });
    const newSelectedObjs = UpdateSelectedObjs(
      newTags,
      newObjs,
      this.defaultObjTags,
      this.selectedObjs,
    );
    const finalObjs = this.orderObjsForTemplate(this.template, newSelectedObjs);
    const molSerials = this.updMolSerials(finalObjs);
    this.setState({
      selectedObjs: finalObjs,
      selMolSerials: molSerials,
    });
  }

  isEqTypeId(a, b) {
    return a.type === b.type && a.id === b.id;
  }

  handleMove({ sourceTag, targetTag }) {
    const oldObjs = this.selectedObjs || [];
    const newObjs = reOrderArr(sourceTag, targetTag, this.isEqTypeId, oldObjs);
    const finalObjs = this.orderObjsForTemplate(this.template, newObjs);
    const molSerials = this.updMolSerials(finalObjs);
    this.setState({
      selectedObjs: finalObjs,
      selMolSerials: molSerials,
    });
  }

  initFileName(template = 'supporting_information') {
    let prefix = 'Supporting_Information_';
    switch (template) {
      case 'standard':
        prefix = 'ELN_Report_';
        break;
      case 'supporting_information':
        prefix = 'Supporting_Information_';
        break;
      default:
        prefix = '';
        break;
    }

    const dt = new Date();
    const yy = dt.getFullYear();
    const mm = dt.getMonth() + 1;
    const dd = dt.getDate();
    const h = dt.getHours();
    const m = dt.getMinutes();
    const s = dt.getSeconds();

    const datetime = `${yy}-${mm}-${dd}H${h}M${m}S${s}`;
    return prefix + datetime;
  }

  handleGetArchives({ archives }) {
    this.setState({ archives });
  }

  handleUpdateFileName(value) {
    const validValue = this.validName(value);
    this.setState({ fileName: validValue });
  }

  validName(text) {
    let name = text.substring(0, 40);
    name = name.replace(/[^a-zA-Z0-9\-_]/g, '');
    return name;
  }

  handleUpdateFileDescription(value) {
    this.setState({ fileDescription: value });
  }

  handleUpdateActiveKey(key) {
    this.setState({ activeKey: key });
  }

  handleDownloadReport(id) {
    this.markReaded(id);
    Utils.downloadFile({
      contents: `api/v1/download_report/docx?id=${JSON.stringify(id)}`,
    });
  }

  markReaded(id) {
    const newArchives = this.archives.map((archive) => {
      const a = Object.assign({}, archive);
      if (archive.id === id) a.unread = false;
      return a;
    });
    this.setState({ archives: newArchives });
  }

  handleUpdateProcessQueue(result) {
    const updatedArchives = result.archives;
    const updatedIds = updatedArchives.map(a => a.id);
    const newProcessings = this.processings.filter(x => updatedIds.indexOf(x) === -1);
    const newArchives = this.archives.map((a) => {
      const index = updatedIds.indexOf(a.id);
      return index === -1 ? a : updatedArchives[index];
    });
    this.setState({
      archives: newArchives,
      processings: newProcessings,
    });
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
    const molSerials = archive.mol_serials ||
      this.updMolSerials(orderedArTpObjs);

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
      selMolSerials: molSerials,
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
    const molSerials = this.updMolSerials(finalObjs);

    this.setState({
      defaultObjTags: dTags,
      selectedObjTags: sTags,
      selectedObjs: finalObjs,
      selMolSerials: molSerials,
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
      selMolSerials: [],
    });
  }

  handleDelete(deletedId) {
    const newArchives = this.archives.map(a => (
      a.id !== deletedId ? a : null
    )).filter(r => r != null);

    this.setState({ archives: newArchives });
  }

  updMolSerials(objs, template) {
    const currentTemplate = template || this.template;
    if (currentTemplate !== 'supporting_information') return [];
    if (objs.length === 0) return [];

    return this.extractMolSerials(objs);
  }

  extractMolSerials(objs) {
    const oldSelMolSerials = this.selMolSerials;
    const newSelMols = this.msMolFromSelected(objs);

    const newSelMolSerials = newSelMols.map((newMol) => {
      const unchangedMolSerial = oldSelMolSerials.find(osm => (
        osm && osm.mol.id === newMol.id
      ));
      return unchangedMolSerial || { mol: newMol, value: null };
    });

    return newSelMolSerials;
  }

  nonGpRxns(objs) {
    return objs.map((obj) => {
      if (obj.type === 'reaction' && obj.role !== 'gp') {
        return obj;
      }
      return null;
    }).filter(r => r !== null);
  }

  msMolFromSelected(objs) {
    const rxns = this.nonGpRxns(objs);
    let msMols = [];

    rxns.forEach((o) => {
      const samples = [...o.starting_materials, ...o.reactants, ...o.products];
      samples.forEach((s) => {
        msMols = [...msMols, this.createMSMol(s.molecule)];
      });
    });
    msMols = ArrayUtils.uniqSortById(msMols);
    return msMols;
  }

  createMSMol(molecule) {
    return {
      id: molecule.id,
      svgPath: molecule.svgPath,
      sumFormula: molecule.sum_formular,
      iupacName: molecule.iupac_name,
    };
  }

  handleUpdMSVal({ moleculeId, value }) {
    const newSelMolSerials = this.selMolSerials.map((ms) => {
      if (ms.mol.id === moleculeId) {
        return Object.assign({}, ms, { value });
      }
      return ms;
    });
    this.setState({ selMolSerials: newSelMolSerials });
  }
}

export default alt.createStore(ReportStore, 'ReportStore');
