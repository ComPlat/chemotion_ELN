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

  // Best-effort UI hint only, not a security boundary: it only recognizes the
  // legacy '***' string placeholder, so it silently misses fields anonymized
  // to a Hash/Array shape (see ApplicationEntity#expose_fields_with_anonymization!)
  // — those can't be told apart from a genuinely empty/default value client-side
  // anyway. The actual gate against writing back an anonymized value is
  // ElementPolicy#update?, which requires full detail level for ANY write to
  // this element's own fields. That guarantee does NOT extend to nested elements
  // of a different type: detail levels are per type and independent, so a
  // reaction shared at detail level 10 can still carry samples anonymized at
  // sample_detail_level 1. See the scope note on ElementPolicy#update?.
  isMethodDisabled(m) {
    return this[m] == '***'
  }

  // Editability derived from the backend `can_update` permission flag. The flag may be
  // undefined when the backend omits it (e.g. list payloads); undefined/true means editable,
  // only an explicit false makes the element read-only. Centralized here so call sites read
  // intent (`element.isReadOnly`) instead of re-deriving `can_update === false` everywhere.
  get isReadOnly() {
    return this.can_update === false;
  }

  static buildID() {
    return uuid.v1();
  }

  get isEdited() {
    return this._checksum !== this.checksum();
  }

  checksum(fieldsToOmit = []) {
    // Make a shallow copy to not mutate `this`
    const tThis = { ...this };
    if (tThis.type === 'screen' && tThis.research_plans !== undefined) {
      tThis.rp_ids = _.map(tThis.research_plans, rp => ({ id: rp.id }));
    }
    return sha256(JSON.stringify(_.omitBy(_.omit(
      tThis,
      ['_checksum', 'belongTo', 'matGroup', 'molecule_names', 'equivalent', '_equivalent',
        'formulaChanged', 'research_plans', ...fieldsToOmit],
    ), (value) => value !== true && _.isEmpty(value))));
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
    return !_.isEmpty(this) && (this.isNew || this.isEdited || this.changed === true);
  }

  updateChecksum(cs) {
    this.changed = false;
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
    let paramsWithoutNullEntries = _.omitBy(params, _.isNull);
    // Same best-effort caveat as isMethodDisabled above: only strips the legacy
    // '***' string placeholder, not Hash/Array-shaped anonymized fields. Not a
    // security boundary — see ElementPolicy#update? for the real one.
    let cleanParams = _.omitBy(paramsWithoutNullEntries, (x) => { return x == '***'})
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
