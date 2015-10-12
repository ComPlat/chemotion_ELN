export default class Molecule {

  constructor(args) {
    Object.assign(this, args);
  }

  get svgPath() {
    return this.molecule_svg_file && `/images/molecules/${this.molecule_svg_file}`
  }

}
