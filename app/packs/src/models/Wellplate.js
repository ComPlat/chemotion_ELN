/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import Element from 'src/models/Element';
import Well from 'src/models/Well';
import Container from 'src/models/Container';
import Segment from 'src/models/Segment';

export default class Wellplate extends Element {
  constructor(args) {
    super(args);
    this.initWellsWithPosition(this.wells, this.size);
  }

  static buildEmpty(collection_id, width = 12, height = 8) {
    return new Wellplate(
      {
        collection_id,
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

  static buildFromSamplesAndCollectionId(clipboardSamples, collection_id, width = 12, height = 8) {
    if (clipboardSamples.length > width * height) {
      throw new Error('Size of wellplate to small for samples!');
    }

    const samples = clipboardSamples.map((sample) => sample.buildChild());

    const wells = samples.map((sample) => new Well({
      sample,
      readouts: []
    }));
    const wellplate = Wellplate.buildEmpty(collection_id, width, height);

    for (let i = 0; i < wells.length; i += 1) {
      wells[i].position = wellplate.calculatePositionOfWellByIndex(i);
      wellplate.wells[i] = wells[i];
    }

    return wellplate;
  }

  static get MAX_DIMENSION() {
    return 99;
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
    return this._wells;
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
    this.width = Number(width);
    this.height = Number(height);

    this.initWellsWithPosition(this.wells, this.size);
  }

  initWellsWithPosition(wells, size) {
    const _wells = wells;
    _wells.length = wells.length <= size ? wells.length : wells.length - (wells.length - size);

    const placeholdersCount = size - _wells.length;
    const placeholders = Array(placeholdersCount).fill({});
    const allWells = _wells.concat(placeholders);

    this.wells = allWells.map((well, i) => this.initWellWithPositionByIndex(well, i));
    this._checksum = this.checksum();
  }

  initWellWithPositionByIndex(well, i) {
    return {
      ...well,
      position: this.calculatePositionOfWellByIndex(i),
      readouts: well.readouts || []
    };
  }

  calculatePositionOfWellByIndex(i) {
    const columns = this.width;
    const columnOfIndex = (i + 1) % columns;

    const x = (columnOfIndex === 0) ? columns : columnOfIndex;
    const y = Math.floor(i / columns) + 1;

    return { x, y };
  }

  title() {
    const short_label = this.short_label ? this.short_label : '';
    return this.name ? `${short_label} ${this.name}` : short_label;
  }
}
