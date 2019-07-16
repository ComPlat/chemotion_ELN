import Element from './Element';
import { isEmpty } from 'lodash';

const uuidv4 = require('uuid/v4');

export default class ResearchPlan extends Element {

  static buildEmpty(collection_id) {
    return new ResearchPlan({
      collection_id: collection_id,
      type: 'research_plan',
      name: 'New Research Plan',
      body: [
        {
          id: uuidv4(),
          type: 'ketcher',
          value: {
            svg_file: null,
            svg_file: null,
            thumb_svg: null
          }
        },
        {
          id: uuidv4(),
          type: 'richtext',
          value: null
        }
      ]
    });
  }

  serialize() {
    return super.serialize({
      name: this.name,
      body: this.body,
      attachments: this.attachments
    });
  }

  get svgPath() {
    if (this.svg_file){
      return `/images/research_plans/${this.svg_file}`;
    } else {
      return `/images/wild_card/no_image_180.svg`
    }
  }

  // overwrite isPendingToSave method in models/Element.js
  get isPendingToSave() {
    return !isEmpty(this) && (this.isNew || this.changed);
  }
}
