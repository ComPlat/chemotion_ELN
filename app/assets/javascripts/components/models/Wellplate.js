import Element from './Element';
import Well from './Well';

export default class Wellplate extends Element {

  constructor(args) {
    super(args)
    this.wells = this.initWellsWithPosition(this.wells, 96);
    this._checksum = this.checksum();
  }

  isMethodDisabled() {
    return false;
  }

  isMethodRestricted(m) {
    return false;
  }

  static buildEmpty() {
    return new Wellplate(
      {
        type: 'wellplate',
        name: 'New Wellplate',
        size: 96,
        description: '',
        wells: []
      }
    )
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
    return this._wells
  }

  set wells(wells) {
    this._wells = wells.map(w => new Well(w));
  }


  serialize() {
    return super.serialize({
      name: this.name,
      size: this.size,
      description: this.description,
      wells: this.wells.map(w => w.serialize())
    })
  }


  // ---

  initWellsWithPosition(wells, size) {
    const placeholdersCount = size - wells.length;
    const placeholders = Array(placeholdersCount).fill({});
    let allWells = wells.concat(placeholders);
    return allWells.map((well, i) => this.initWellWithPositionByIndex(well, i));
  }

  initWellWithPositionByIndex(well, i) {
    return {
      ...well,
      position: this.calculatePositionOfWellByIndex(i)
    }
  }

  calculatePositionOfWellByIndex(i) {
    const cols = 12;
    let remainder = (i + 1) % cols;
    return {
      x: (remainder == 0) ? cols : remainder,
      y: Math.floor(i / cols) + 1
    };
  }

}
