import Well from './Well';

export default class Wellplate {

  constructor(args) {
    Object.assign(this, args);
    this.wells = this.initWellsWithPosition(this.wells, 96);
  }

  static buildEmpty() {
    return new Wellplate(
      {
        id: '_new_',
        type: 'wellplate',
        name: 'New Wellplate',
        size: 96,
        description: '',
        wells: []
      }
    )
  }

  get wells() {
    return this._wells
  }

  set wells(wells) {
    this._wells = wells.map(w => new Well(w));
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
