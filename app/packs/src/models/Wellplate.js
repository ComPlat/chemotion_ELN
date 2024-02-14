/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import Element from 'src/models/Element';
import Well from 'src/models/Well';
import Container from 'src/models/Container';
import Segment from 'src/models/Segment';

export default class Wellplate extends Element {
  constructor(args) {
    super(args);
    this.wells = this.initWellsWithPosition(this.wells, this.size);
    this._checksum = this.checksum();
  }

  static buildEmpty(collection_id) {
    return new Wellplate(
      {
        collection_id,
        type: 'wellplate',
        name: 'New Wellplate',
        size: 96,
        description: Wellplate.quillDefault(),
        wells: [],
        readout_titles: [],
        container: Container.init(),
        segments: [],
        attachments: []
      }
    );
  }

  static buildFromSamplesAndCollectionId(clipboardSamples, collection_id) {
    const samples = clipboardSamples.map((sample) => sample.buildChild());

    const wells = samples.map((sample) => new Well({
      sample,
      readouts: []
    }));

    return new Wellplate(
      {
        collection_id,
        type: 'wellplate',
        name: 'New Wellplate',
        size: 96,
        description: Wellplate.quillDefault(),
        wells,
        readout_titles: [],
        container: Container.init(),
        segments: [],
        attachments: [],
      }
    );
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

  serialize() {
    return super.serialize({
      name: this.name,
      size: this.size,
      description: this.description,
      wells: this.wells.map((w) => w.serialize()),
      readout_titles: this.readout_titles,
      container: this.container,
      attachments: this.attachments,
      segments: this.segments.map((s) => s.serialize())
    });
  }

  // ---

  initWellsWithPosition(wells, size) {
    const placeholdersCount = size - wells.length;
    const placeholders = Array(placeholdersCount).fill({});
    const allWells = wells.concat(placeholders);
    return allWells.map((well, i) => this.initWellWithPositionByIndex(well, i));
  }

  initWellWithPositionByIndex(well, i) {
    return {
      ...well,
      position: this.calculatePositionOfWellByIndex(i),
      readouts: well.readouts || []
    };
  }

  calculatePositionOfWellByIndex(i) { // eslint-disable-line class-methods-use-this
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
