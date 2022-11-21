import uuid from 'uuid';
import sha256 from 'sha256';
import _ from 'lodash';

export default class Element {

  constructor(args) {
    Object.assign(this, args);
    if(!this.id) {
      this.id = Element.buildID();
      this.is_new = true
    }
    this.updateChecksum();
  }

  isMethodDisabled(m) {
    return this[m] == '***'
  }

  static buildID() {
    return uuid.v1();
  }

  get isEdited() {
    return this._checksum != this.checksum();
  }

  checksum(fieldsToOmit = []) {
    const tThis = this;
    if (tThis.type === 'screen' && tThis.research_plans !== undefined) {
      tThis.rp_ids = _.map(tThis.research_plans, rp => ({ id: rp.id }));
    }
    return sha256(JSON.stringify(_.omit(_.omit(
      tThis,
      ['_checksum', 'belongTo', 'matGroup', 'molecule_names', 'equivalent', '_equivalent', 'formulaChanged', 'research_plans', ...fieldsToOmit],
    ), _.isEmpty)));
  }

  get getChecksum() {
    return this._checksum
  }

  get isNew() {
    return this.is_new == true
  }

  set isNew(boolean) {
    this.is_new = boolean;
  }

  get isPendingToSave() {
    return !_.isEmpty(this) && (this.isNew || this.isEdited);
  }

  updateChecksum(cs) {
    if (cs) {
      this._checksum = cs
    } else {
      this._checksum = this.checksum();
    }
  }

  buildCopy() {
    return new this.constructor(_.omit(this, 'id'))
  }

  clone() {
    return new this.constructor(this);
  }

  // methods regarding sharing and detail levels
  isRestricted() {
    return this.is_restricted;
  }

  title() {
    return this.name;
  }

  // base serializer
  serialize(extraParams = {}) {
    let params = {
      id: this.id,
      type: this.type,
      is_new: this.isNew || false,
      collection_id: this.collection_id
    }
    _.merge(params, extraParams);
    let paramsWithoutNullEntries = _.omit(params, _.isNull);
    let cleanParams = _.omit(paramsWithoutNullEntries, (x) => { return x == '***'})
    return cleanParams;
  }

  // get analyses container if any
  analysesContainers() {
    if (this.container.children.length === 0) {
      const analyses = Container.buildEmpty();
      analyses.container_type = 'analyses';
      this.container.children.push(analyses);
    }
    return this.container
      .children
      .filter((el) => ~el.container_type.indexOf('analyses'));
  }

  analysisContainers() {
    let target = [];
    this.analysesContainers().forEach((aec) => {
      const aics = aec.children
        .filter(el => ~el.container_type.indexOf('analysis'));
      target = [...target, ...aics];
    });
    return target;
  }

  datasetContainers() {
    let target = [];
    this.analysisContainers().forEach((aic) => {
      const dts = aic.children
        .filter(el => ~el.container_type.indexOf('dataset'));
      target = [...target, ...dts];
    });
    return target;
  }
  
  getAnalysisContainersCompareable() {
    let result = {};
    const analysisContainers = this.analysisContainers();
    analysisContainers.forEach((aic) => {
      const mKind = aic.extended_metadata.kind;
      const kind = (mKind && mKind !== '') ? (mKind.split('|')[1].trim().split(' (')) : undefined;
      let layout = kind !== undefined ? kind[kind.length-1] : undefined;
      if (layout !== undefined) {
        layout = layout.replace(')', '');
        let listAics = result[layout] ? result[layout] : [];
        const dts = aic.children.filter(el => ~el.container_type.indexOf('dataset'));
        const aicWithDataset = Object.assign({}, aic, { children: dts});
        listAics.push(aicWithDataset);
        result[layout] = listAics;
      }

    });
    return result;
  }

  // Return true if the element has at least one analysis
  analysesPresent() {
    if (!this.container) { return false; }

    const analysesContainer = this.container.children?.find((container) => container?.container_type === 'analyses');
    if (!analysesContainer) { return false; }

    const analysis = analysesContainer.children?.find((container) => container?.container_type === 'analysis');
    return !!analysis;
  }

  // temporary alias for analyses. Still used by Report tool
  get analyses() {
    if (!this.container) { return []; }

    const analysesContainer = this.container.children?.find((container) => container?.container_type === 'analyses');
    if (!analysesContainer) { return []; }

    return analysesContainer.children?.filter((container) => container?.container_type === 'analysis');
  }

  // Default empty quill-delta
  static quillDefault() {
    return { ops: [{ insert: '\n' }] };
  }
}
