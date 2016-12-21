import Element from './Element';

export default class ResearchPlan extends Element {
  /*isMethodRestricted(m) {
    return false;
  }*/

  static buildEmpty(collection_id) {
    return new ResearchPlan({
      collection_id: collection_id,
      type: 'research_plan',
      name: 'New Research Plan',
      description: '',
      svg_file: '',
      sdf_file: ''
    });
  }

  serialize() {
    return super.serialize({
      name: this.name,
      description: this.description,
      svg_file: this.svg_file,
      sdf_file: this.sdf_file
    });
  }

  get svgPath() {
    if (this.svg_file){
      return `/images/research_plans/${this.svg_file}`;
    } else {
      return `/images/no_image_180.svg`
    }
  }
}
