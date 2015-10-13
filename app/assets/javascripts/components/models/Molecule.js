import Element from './Element';

export default class Molecule extends Element {

  get svgPath() {
    return this.molecule_svg_file && `/images/molecules/${this.molecule_svg_file}`
  }

}
