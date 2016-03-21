import Element from './Element';

export default class Molecule extends Element {
  get svgPath() {
    return this.molecule_svg_file && `/images/molecules/${this.molecule_svg_file}`
  }

  get correctedMolecularWeight() {
    if(this.is_partial) {
      return this.molecular_weight - 1.0079;
    } else {
      return this.molecular_weight;
    }
  }

  get mwPrefix(){
    if(this.is_partial) {
      return 'Defined part: ';
    } else {
      return '';
    }
  }

  serialize() {
    return ({
      density: this.density,
      melting_point: this.melting_point,
      boiling_point: this.boiling_point,
    })
  }
}
