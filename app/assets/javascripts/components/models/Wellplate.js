import Well from './Well';

export default class Wellplate {

  constructor(args) {
    Object.assign(this, args);
  }

  static buildEmpty() {
    new Wellplate(
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


}
