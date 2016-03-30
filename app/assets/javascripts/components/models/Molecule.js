import Element from './Element';

export default class Molecule extends Element {
  get svgPath() {
    return this.molecule_svg_file && `/images/molecules/${this.molecule_svg_file}`
  }

  serialize() {
    return ({
      density: this.density,
      melting_point: this.melting_point,
      boiling_point: this.boiling_point,
    })
  }
}
