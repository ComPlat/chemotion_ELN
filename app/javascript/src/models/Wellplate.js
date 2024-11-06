/* eslint-disable no-underscore-dangle */
import Element from 'src/models/Element';
import Well from 'src/models/Well';
import Container from 'src/models/Container';
import Segment from 'src/models/Segment';

export default class Wellplate extends Element {
  constructor(args) {
    super(args);
    this.#initEmptyWells();
  }

  static buildEmpty(collectionId, width = 12, height = 8) {
    return new Wellplate(
      {
        collection_id: collectionId,
        type: 'wellplate',
        name: 'New Wellplate',
        width,
        height,
        description: Wellplate.quillDefault(),
        wells: [],
        readout_titles: [],
        container: Container.init(),
        segments: [],
        attachments: []
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
    return 99;
  }

  static columnLabel(columnIndex) {
    if (columnIndex == 0) return ''

    return columnIndex
  }

  static rowLabel(rowIndex) {
    if (rowIndex == 0) return ''

    const rowLabels = [
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), // row 1-26
      ...'AA AB AC AD AE AF AG AH AI AJ AK AL AM AN AO AP AQ AR AS AT AU AV AW AX AY AZ'.split(' '), // row 27-52
      ...'BA BB BC BD BE BF BG BH BI BJ BK BL BM BN BO BP BQ BR BS BT BU BV BW BX BY BZ'.split(' '), // row 53-78
      ...'CA CB CC CD CE CF CG CH CI CJ CK CL CM CN CO CP CQ CR CS CT CU CV CW CX CY CZ'.split(' ')  // row 79-104
    ]

  return rowLabels[rowIndex - 1]
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

  set segments(segments) {
    this._segments = (segments && segments.map((s) => new Segment(s))) || [];
  }

  get segments() {
    return this._segments || [];
  }

  get size() {
    return this.width * this.height;
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
      attachments: this.attachments,
      segments: this.segments.map((s) => s.serialize())
    });
  }

  changeSize(width, height) {
    // change actual dimensions
    this.width = Number(width);
    this.height = Number(height);

    // copy wells, so that we can set a new size for the wells while keeping the old positions
    const oldWells = this.wells.map((well) => well);

    // initalize wells with new size
    this.#initEmptyWells();

    // calculate new index from old position and set well at new index if it is within the new size
    this.#moveWellsToNewIndexWhileKeepingOldPosition(oldWells);
  }

  #moveWellsToNewIndexWhileKeepingOldPosition(oldWells) {
    oldWells.forEach((well) => {
      const index = this.#calculateIndexFromPosition(well.position);
      if (index < this.size) {
        this.wells[index] = well;
      }
    });
    this._checksum = this.checksum();
  }

  #initEmptyWells() {
    if (!this.isNew) return
    
    this.wells = Array(this.size).fill({});
    this.wells = this.wells.map((well, i) => this.#initWellWithPositionByIndex(well, i));
    this._checksum = this.checksum();
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

  #calculateIndexFromPosition(position) {
    return (position.y - 1) * this.width + position.x - 1;
  }
}
