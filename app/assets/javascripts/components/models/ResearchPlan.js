import React from 'react';
import { isEmpty } from 'lodash';

import Element from './Element';

const uuidv4 = require('uuid/v4');

export default class ResearchPlan extends Element {

  static buildEmpty(collection_id) {
    return new ResearchPlan({
      collection_id: collection_id,
      type: 'research_plan',
      name: 'New Research Plan',
      body: []
    });
  }

  serialize() {
    return super.serialize({
      name: this.name,
      body: this.body,
      attachments: this.attachments
    });
  }

  addBodyField(type) {
    switch (type) {
      case 'richtext':
        this.body.push({
          id: uuidv4(),
          type: 'richtext',
          value: null
        })
        break;
      case 'ketcher':
        this.body.push({
          id: uuidv4(),
          type: 'ketcher',
          value: {
            svg_file: null,
            svg_file: null,
            thumb_svg: null
          }
        })
        break;
      case 'table':
        break;
      case 'image':
        this.body.push({
          id: uuidv4(),
          type: 'image',
          value: {
            file_name: null,
            public_name: null,
          }
        })
    }
  }

  get svgPath() {
    for (var i = 0; i < this.body.length; i++) {
      if (this.body[i].type == 'ketcher') {
        return `/images/research_plans/${this.body[i].value.svg_file}`
      }
    }

    return `/images/wild_card/no_image_180.svg`
  }

  // overwrite isPendingToSave method in models/Element.js
  get isPendingToSave() {
    return !isEmpty(this) && (this.isNew || this.changed);
  }
}
