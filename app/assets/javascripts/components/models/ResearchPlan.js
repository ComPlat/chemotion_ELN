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
        const columns = ['a', 'b'].map(columnName => {
          return {
              key: columnName,
              name: columnName,
              editable: true,
              resizable: true,
              width: 200
            }
        })

        this.body.push({
          id: uuidv4(),
          type: 'table',
          value: {
            columns: columns,
            rows: [
              {a: '1', b: ''},
              {a: '2', b: ''},
              {a: '3', b: ''}
            ]
          }
        })
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
        break;
      case 'sample':
        this.body.push({
          id: uuidv4(),
          type: 'sample',
          value: {
            sample_id: null
          }
        })
        break;
      case 'reaction':
        this.body.push({
          id: uuidv4(),
          type: 'reaction',
          value: {
            reaction_id: null
          }
        })
        break;
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
