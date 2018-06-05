import moment from 'moment';
import _ from 'lodash';
import alt from '../alt';
import ReportActions from '../actions/ReportActions';
import Utils from '../utils/Functions';
import ArrayUtils from '../utils/ArrayUtils';
import UserStore from './UserStore';
import { reOrderArr } from '../utils/DndControl';
import { UpdateSelectedObjs } from '../utils/ReportHelper';
import UIFetcher from '../fetchers/UIFetcher';

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
    this.siRxnSettings = [
      { checked: true, text: 'Name' },
      { checked: true, text: 'CAS' },
      { checked: true, text: 'Formula' },
      { checked: true, text: 'Smiles' },
      { checked: true, text: 'InCHI' },
      { checked: true, text: 'Molecular Mass' },
      { checked: true, text: 'Exact Mass' },
      { checked: true, text: 'EA' },
    ];
    this.configs = [
      { checked: true, text: 'Page Break' },
      { checked: true, text: 'Show all chemicals in schemes (unchecked to show products only)' },
    ];
    this.checkedAllSplSettings = true;
    this.checkedAllRxnSettings = true;
    this.checkedAllSiRxnSettings = true;
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
    this.prdAtts = [];
    this.attThumbNails = [];

    this.bindListeners({
      handleUpdateSplSettings: ReportActions.updateSplSettings,
      handleToggleSplSettingsCheckAll: ReportActions.toggleSplSettingsCheckAll,
      handleUpdateRxnSettings: ReportActions.updateRxnSettings,
      handleToggleRxnSettingsCheckAll: ReportActions.toggleRxnSettingsCheckAll,
      handleUpdateSiRxnSettings: ReportActions.updateSiRxnSettings,
      handleToggleSiRxnSettingsCheckAll: ReportActions.toggleSiRxnSettingsCheckAll,
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
      handleUpdateThumbNails: ReportActions.updateThumbNails,
      handleUpdateDefaultTags: ReportActions.updateDefaultTags,
    });
  }

  handleUpdateImgFormat(value) {
    this.setState({ imgFormat: value });
  }

  handleUpdateTemplate(value) {
    const newSelectedObjs = this.orderObjsForTemplate(value);
    const molSerials = this.updMolSerials(newSelectedObjs, value);
    const newPrdAtts = this.extractPrdAtts(newSelectedObjs);
    this.setState({ template: value,
      fileName: this.initFileName(value),
      selectedObjs: newSelectedObjs,
      prdAtts: newPrdAtts,
      selMolSerials: molSerials,
    });
  }

  orderObjsForTemplate(template, oldObjs = null) {
    const oldSelectedObjs = oldObjs || this.selectedObjs;
    if (template !== 'standard') {
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

  handleUpdateSiRxnSettings(target) {
    this.setState({
      siRxnSettings: this.siRxnSettings.map((s) => {
        if (s.text === target.text) {
          return Object.assign({}, s, { checked: !target.checked });
        }
        return s;
      }),
    });
  }

  handleToggleSiRxnSettingsCheckAll() {
    const newCheckValue = !this.checkedAllSiRxnSettings;
    this.setState({
      siRxnSettings: this.siRxnSettings.map(s => (
        Object.assign({}, s, { checked: newCheckValue })
      )),
      checkedAllSiRxnSettings: newCheckValue,
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

  handleUpdateCheckedTags(uiState) {
    const { sample, reaction, currentCollection } = uiState;
    const sampleCheckedIds = sample.checkedIds.toArray();
    const reactionCheckedIds = reaction.checkedIds.toArray();
    const { sampleIds, reactionIds } = this.selectedObjTags;
    const dfSIds = _.difference(sampleCheckedIds, sampleIds)
      .filter(id => !this.defaultObjTags.sampleIds.includes(id));
    const dfRIds = _.difference(reactionCheckedIds, reactionIds)
      .filter(id => !this.defaultObjTags.reactionIds.includes(id));

    // const diffTags = { sample: dfSIds, reaction: dfRIds };

    const elementAdded = dfSIds.length > 0 || dfRIds.length > 0
      || sample.checkedAll || reaction.checkedAll;

    const elementSubs = _.difference(sampleIds, sampleCheckedIds).length > 0
      || _.difference(reactionIds, reactionCheckedIds).length > 0;

    if (elementAdded) {
      UIFetcher.fetchByUIState({ sample, reaction, currentCollection })
        .then((result) => {
          const newTags = {
            sampleIds: result.samples.map(e => e.id),
            reactionIds: result.reactions.map(e => e.id)
          };
          const newObjs = result;
          const newSelectedObjs = UpdateSelectedObjs(
            newTags,
            newObjs,
            this.defaultObjTags,
            this.selectedObjs,
          );
          const finalObjs = this.orderObjsForTemplate(this.template, newSelectedObjs);
          const molSerials = this.updMolSerials(finalObjs);
          const newPrdAtts = this.extractPrdAtts(finalObjs);
          this.setState({
            selectedObjTags: newTags,
            selectedObjs: finalObjs,
            prdAtts: newPrdAtts,
            selMolSerials: molSerials,
          });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    } else if (elementSubs) {
      const newTags = {
        sampleIds: sampleCheckedIds,
        reactionIds: reactionCheckedIds
      };
      const newSelectedObjs = UpdateSelectedObjs(
        newTags,
        { samples: [], reactions: [] },
        this.defaultObjTags,
        this.selectedObjs,
      );
      const finalObjs = this.orderObjsForTemplate(this.template, newSelectedObjs);
      const molSerials = this.updMolSerials(finalObjs);
      const newPrdAtts = this.extractPrdAtts(finalObjs);
      this.setState({
        selectedObjTags: newTags,
        selectedObjs: finalObjs,
        prdAtts: newPrdAtts,
        selMolSerials: molSerials,
      });
    }
  }

  isEqTypeId(a, b) {
    return a.type === b.type && a.id === b.id;
  }

  handleMove({ sourceTag, targetTag }) {
    const oldObjs = this.selectedObjs || [];
    const newObjs = reOrderArr(sourceTag, targetTag, this.isEqTypeId, oldObjs);
    const finalObjs = this.orderObjsForTemplate(this.template, newObjs);
    const molSerials = this.updMolSerials(finalObjs);
    const newPrdAtts = this.extractPrdAtts(finalObjs);
    this.setState({
      selectedObjs: finalObjs,
      prdAtts: newPrdAtts,
      selMolSerials: molSerials,
    });
  }

  stdReportPrefix() {
    const { currentUser } = UserStore.getState();
    return currentUser.initials;
  }

  initFileName(template = 'supporting_information') {
    let prefix = 'Supporting_Information_';
    let datetime = moment().format('YYYY-MM-DD[H]HH[M]mm[S]ss');

    switch (template) {
      case 'standard':
        prefix = this.stdReportPrefix();
        datetime = moment().format('YYYYMMDD');
        break;
      case 'spectrum':
        prefix = 'Spectra_';
        break;
      case 'supporting_information':
        prefix = 'Supporting_Information_';
        break;
      default:
        prefix = '';
        break;
    }

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
    const { objs, archive, defaultObjTags } = result;
    const { template, file_description, img_format, configs } = archive;
    const ss = archive.sample_settings;
    const rs = archive.reaction_settings;
    const siRs = archive.si_reaction_settings;
    const newObjs = UpdateSelectedObjs(defaultObjTags, objs, defaultObjTags);
    const orderedArObjs = this.orderObjsForArchive(newObjs, archive.objects);
    const orderedArTpObjs = this.orderObjsForTemplate(template, orderedArObjs);
    const molSerials = archive.mol_serials ||
      this.updMolSerials(orderedArTpObjs);
    const newPrdAtts = this.extractPrdAtts(orderedArTpObjs);

    this.setState({
      activeKey: 0,
      template,
      fileDescription: file_description,
      fileName: this.initFileName(template),
      imgFormat: img_format,
      checkedAllSplSettings: false,
      checkedAllRxnSettings: false,
      checkedAllSiRxnSettings: false,
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
      siRxnSettings:
        [
          { checked: siRs.Name, text: 'Name' },
          { checked: siRs.CAS, text: 'CAS' },
          { checked: siRs.Formula, text: 'Formula' },
          { checked: siRs.Smiles, text: 'Smiles' },
          { checked: siRs.InCHI, text: 'InCHI' },
          { checked: siRs['Molecular Mass'], text: 'Molecular Mass' },
          { checked: siRs['Exact Mass'], text: 'Exact Mass' },
          { checked: siRs.EA, text: 'EA' },
        ],
      configs:
        [
          { text: 'Page Break', checked: configs.page_break },
          { text: 'Show all chemicals in schemes (unchecked to show products only)', checked: configs.page_break },
        ],
      defaultObjTags,
      selectedObjTags: { sampleIds: [], reactionIds: [] },
      selectedObjs: orderedArTpObjs,
      prdAtts: newPrdAtts,
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
    const newPrdAtts = this.extractPrdAtts(finalObjs);

    this.setState({
      defaultObjTags: dTags,
      selectedObjTags: sTags,
      selectedObjs: finalObjs,
      prdAtts: newPrdAtts,
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
      checkedAllSiRxnSettings: true,
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
      siRxnSettings:
        [
          { checked: true, text: 'Name' },
          { checked: true, text: 'CAS' },
          { checked: true, text: 'Formula' },
          { checked: true, text: 'Smiles' },
          { checked: true, text: 'InCHI' },
          { checked: true, text: 'Molecular Mass' },
          { checked: true, text: 'Exact Mass' },
          { checked: true, text: 'EA' },
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
      prdAtts: [],
      attThumbNails: [],
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
    if (currentTemplate === 'standard') return [];
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

  extractPrdAtts(selectedObjs) {
    if (selectedObjs.length > 0) {
      const prdAtts = selectedObjs.map((obj) => {
        if (obj.role !== 'gp') {
          return this.extractPrdsAtts(obj);
        }
        return null;
      }).filter(r => r !== null);
      return [].concat(...prdAtts).filter(r => r.atts.length !== 0);
    }
    return [];
  }

  extractPrdsAtts(obj) {
    if (obj.type === 'reaction') {
      return obj.products.map((prd) => {
        const prdId = prd.id;
        const { iupac_name, sum_formular, id } = prd.molecule;
        const atts = this.extractAtts(prd);
        return Object.assign(
          {}, { atts, prdId, iupac_name, sum_formular, molId: id },
        );
      });
    }
    return null;
  }

  extractAtts(prd) {
    const atts = prd.container.children[0].children.map((container) => {
      const isReport = container.extended_metadata.report;
      if (!isReport) return null;
      const kind = container.extended_metadata.kind;
      return container.children.map(analysis => (
        analysis.attachments.map(att => (
          Object.assign({}, att, { kind })
        ))
      ));
    });
    return _.flattenDeep(atts).filter(r => r !== null);
  }

  handleUpdateThumbNails(result) {
    const thumbs = result.thumbnails;
    this.setState({ attThumbNails: thumbs });
  }

  handleUpdateDefaultTags(defaultTags) {
    this.setState({ defaultTags });
    // TODO: update selectedObjs?
  }
}

export default alt.createStore(ReportStore, 'ReportStore');
