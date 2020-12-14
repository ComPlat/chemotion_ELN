import { isEmpty } from 'lodash';
import Element from './Element';
import Container from './Container';
import Segment from './Segment';

const uuidv4 = require('uuid/v4');

const columns = [
  {
    headerName: 'a',
    field: 'a',
    colId: 'a'
  },
  {
    headerName: 'b',
    field: 'b',
    colId: 'b'
  },
  {
    headerName: 'c',
    field: 'c',
    colId: 'c'
  },
  {
    headerName: 'd',
    field: 'd',
    colId: 'd'
  },
  {
    headerName: 'e',
    field: 'e',
    colId: 'e'
  },
  {
    headerName: 'f',
    field: 'f',
    colId: 'f'
  }
];


export default class ResearchPlan extends Element {
  constructor(args) {
    super(args);
    this.mode = args.mode ? args.mode : 'view';
  }

  static buildEmpty(collectionId) {
    return new ResearchPlan({
      collection_id: collectionId,
      type: 'research_plan',
      name: 'New Research Plan',
      body: [],
      mode: 'edit',
      container: Container.init(),
      changed: true,
      can_update: true,
      attachments: [],
      segments: []
    });
  }

  serialize() {
    return super.serialize({
      name: this.name,
      body: this.body,
      attachments: this.attachments,
      container: this.container,
      segments: this.segments.map(s => s.serialize())
    });
  }


  analysesContainers() {
    if (this.container.children.length === 0) {
      const analyses = Container.buildEmpty();
      analyses.container_type = 'analyses';
      this.container.children.push(analyses);
    }
    return this.container
      .children
      .filter(el => ~el.container_type.indexOf('analyses'));
  }

  addBodyField(type) {
    switch (type) {
      case 'richtext':
        this.body.push({
          id: uuidv4(),
          type: 'richtext',
          value: null
        });
        break;
      case 'ketcher':
        this.body.push({
          id: uuidv4(),
          type: 'ketcher',
          value: {
            svg_file: null,
            thumb_svg: null
          }
        });
        break;
      case 'table':
        this.body.push({
          id: uuidv4(),
          type: 'table',
          value: {
            columns,
            rows: [
              {
                a: '', b: '', c: '', d: '', e: '', f: ''
              },
              {
                a: '', b: '', c: '', d: '', e: '', f: ''
              },
              {
                a: '', b: '', c: '', d: '', e: '', f: ''
              },
            ]
          }
        });
        break;
      case 'image':
        this.body.push({
          id: uuidv4(),
          type: 'image',
          value: {
            file_name: null,
            public_name: null,
            zoom: null
          }
        });
        break;
      case 'sample':
        this.body.push({
          id: uuidv4(),
          type: 'sample',
          value: {
            sample_id: null
          }
        });
        break;
      case 'reaction':
        this.body.push({
          id: uuidv4(),
          type: 'reaction',
          value: {
            reaction_id: null
          }
        });
        break;
      default:
        break;
    }
  }

  get svgPath() {
    for (let i = 0; i < this.body.length; i += 1) {
      if (this.body[i].type === 'ketcher') {
        return `/images/research_plans/${this.body[i].value.svg_file}`;
      }
    }
    return '/images/wild_card/no_image_180.svg';
  }

  // overwrite isPendingToSave method in models/Element.js
  get isPendingToSave() {
    return !isEmpty(this) && (this.isNew || this.changed);
  }

  get mode() {
    return this._mode;
  }

  set mode(mode) {
    this._mode = mode;
  }

  set segments(segments) {
    this._segments = (segments && segments.map(s => new Segment(s))) || [];
  }

  get segments() {
    return this._segments || [];
  }
}
