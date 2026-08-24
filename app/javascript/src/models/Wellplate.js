/* eslint-disable no-underscore-dangle */
import sha256 from 'sha256';
import Element from 'src/models/Element';
import Well from 'src/models/Well';
import Container from 'src/models/Container';
import Segment from 'src/models/Segment';

export default class Wellplate extends Element {
  constructor(args) {
    super(args);
    this.#initEmptyWells();
    // #initEmptyWells may have built the grid after Element's constructor
    // already hashed the element, so re-baseline both checksums here. Nothing
    // else may reset them: a resize has to register as a real change.
    this.updateChecksum();
  }

  static buildEmpty(collectionId, width = 0, height = 0) {
    return new Wellplate(
      {
        collection_id: collectionId,
        type: 'wellplate',
        name: 'New Wellplate',
        width,
        height,
        description: Wellplate.quillDefault(),
        wells: [],
        user_labels: [],
        readout_titles: [],
        container: Container.init(),
        segments: [],
        attachments: [],
        can_update: true,
      }
    );
  }

  static buildFromSamplesAndCollectionId(clipboardSamples, collectionId, width = 12, height = 8) {
    if (clipboardSamples.length > width * height) {
      throw new Error(`Wellplate of size ${width * height} to small for ${clipboardSamples.length} samples!`);
    }

    const samples = clipboardSamples.map((sample) => sample.buildChild());

    const wellplate = Wellplate.buildEmpty(collectionId, width, height);

    samples.forEach((sample, index) => {
      wellplate.wells[index].sample = sample;
    });

    return wellplate;
  }

  static get MAX_DIMENSION() {
    return 100;
  }

  static columnLabel(columnIndex) {
    if (columnIndex === 0) return '';

    return columnIndex;
  }

  static rowLabel(rowIndex) {
    if (rowIndex === 0) return '';

    const rowLabels = [
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), // row 1-26
      ...'AA AB AC AD AE AF AG AH AI AJ AK AL AM AN AO AP AQ AR AS AT AU AV AW AX AY AZ'.split(' '), // row 27-52
      ...'BA BB BC BD BE BF BG BH BI BJ BK BL BM BN BO BP BQ BR BS BT BU BV BW BX BY BZ'.split(' '), // row 53-78
      ...'CA CB CC CD CE CF CG CH CI CJ CK CL CM CN CO CP CQ CR CS CT CU CV CW CX CY CZ'.split(' ')  // row 79-104
    ];

  return rowLabels[rowIndex - 1];
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get description() {
    return this._description;
  }

  set description(description) {
    this._description = description;
  }

  get wells() {
    return this._wells || [];
  }

  set wells(wells) {
    this._wells = wells.map((w) => new Well(w));
  }

  userLabels() {
    return this.user_labels;
  }

  setUserLabels(userLabels) {
    this.user_labels = userLabels;
  }

  set segments(segments) {
    this._segments = (segments && segments.map((s) => new Segment(s))) || [];
  }

  get segments() {
    return this._segments || [];
  }

  get size() {
    return this.width * this.height;
  }

  checksum(fieldsToOmit = []) {
    return super.checksum(['attachments', '_wellsChecksum', ...fieldsToOmit]);
  }

  /**
   * Hash of the wells alone, so an unsaved well edit can be told apart from any
   * other unsaved edit. The size control keys off this: resizing is refused
   * while well changes are pending, because the two must be persisted as
   * separate steps.
   */
  wellsChecksum() {
    return sha256(JSON.stringify(this.wells.map((well) => well.serialize())));
  }

  get hasPendingWellChanges() {
    return this._wellsChecksum !== this.wellsChecksum();
  }

  updateChecksum(cs) {
    this._wellsChecksum = this.wellsChecksum();
    super.updateChecksum(cs);
  }

  /**
   * Wells holding data that a grid of `width` x `height` would have no room
   * for. Non-empty means the resize must be refused; the server enforces the
   * same rule in Usecases::Wellplates::Resize.
   */
  occupiedWellsOutside(width, height) {
    return this.wells.filter((well) => (
      well.position
      && (well.position.x > width || well.position.y > height)
      && well.hasContent
    ));
  }

  title() {
    const shortLabel = this.short_label ? this.short_label : '';
    return this.name ? `${shortLabel} ${this.name}` : shortLabel;
  }

  serialize() {
    return super.serialize({
      name: this.name,
      size: this.size,
      description: this.description,
      wells: this.wells.map((w) => w.serialize()),
      readout_titles: this.readout_titles,
      container: this.container,
      height: this.height,
      width: this.width,
      user_labels: this.user_labels || [],
      attachments: this.attachments,
      segments: this.segments.map((s) => s.serialize())
    });
  }

  /**
   * Rebuilds the grid, keeping every well whose position still fits and
   * dropping the rest.
   *
   * Wells are matched by position, not by index: indexing against the *new*
   * width used to wrap an out-of-range well into the next row instead of
   * dropping it, and left the survivors carrying stale positions that the
   * server then persisted verbatim.
   *
   * On a persisted wellplate the server owns this reconciliation
   * (Usecases::Wellplates::Resize); this runs for wellplates that have not been
   * created yet, where the grid only exists in memory.
   */
  changeSize(width, height) {
    this.width = Number(width);
    this.height = Number(height);

    const keptByPosition = new Map();
    this.wells.forEach((well) => {
      if (!well.position) return;
      if (well.position.x > this.width || well.position.y > this.height) return;

      keptByPosition.set(`${well.position.x}:${well.position.y}`, well);
    });

    this.wells = Array.from({ length: this.size }, (_, index) => {
      const position = this.#calculatePositionFromIndex(index);

      return keptByPosition.get(`${position.x}:${position.y}`) || { position, readouts: [] };
    });
  }

  #initEmptyWells() {
    // A persisted wellplate keeps whatever wells the server sent, including
    // none at all: re-initialising here would discard them, and saving the
    // emptied list makes the server destroy every sample they held.
    if (!this.isNew) return;

    this.wells = Array(this.size).fill({});
    this.wells = this.wells.map((well, i) => this.#initWellWithPositionByIndex(well, i));
  }

  #initWellWithPositionByIndex(well, i) {
    return {
      ...well,
      position: this.#calculatePositionFromIndex(i),
      readouts: well.readouts || []
    };
  }

  #calculatePositionFromIndex(i) {
    const columnOfIndex = (i + 1) % this.width;

    const x = (columnOfIndex === 0) ? this.width : columnOfIndex;
    const y = Math.floor(i / this.width) + 1;

    return { x, y };
  }
}
