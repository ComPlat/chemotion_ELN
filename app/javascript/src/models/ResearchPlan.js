import { isEmpty } from 'lodash';
import Element from 'src/models/Element';
import Container from 'src/models/Container';
import Segment from 'src/models/Segment';
import Wellplate from 'src/models/Wellplate';
import Attachment from './Attachment';

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
      user_labels: [],
      attachments: [],
      wellplates: [],
      segments: []
    });
  }

  serialize() {
    return super.serialize({
      name: this.name,
      body: this.body,
      attachments: this.attachments,
      container: this.container,
      wellplate_ids: this.wellplateIDs,
      user_labels: this.user_labels || [],
      segments: this.segments.map((s) => s.serialize())
    });
  }

  addBodyField(type) {
    switch (type) {
      case 'richtext':
        this.body.push({
          id: uuidv4(),
          type: 'richtext',
          title: 'Text',
          value: ''
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

  // returns the body element with the given id, or undefined if not found
  getBodyElementById(id) {
    return this.body.find((el) => el.id === id);
  }

  get attachmentCount() {
    if (this.attachments) { return this.attachments.length; }
    return this.attachment_count;
  }

  get wellplateIDs() {
    return this.wellplates.map((wp) => wp.id);
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
    this._segments = (segments && segments.map((s) => new Segment(s))) || [];
  }

  get segments() {
    return this._segments || [];
  }

  userLabels() {
    return this.user_labels;
  }

  setUserLabels(userLabels) {
    this.user_labels = userLabels;
  }

  set wellplates(wellplates) {
    this._wellplates = (wellplates && wellplates.map((w) => new Wellplate(w))) || [];
  }

  get wellplates() {
    return this._wellplates || [];
  }

  upsertAttachments(attachmentsToAdd = []) {
    const idsOfAttachmentsInResearchPlan = this.attachments.map(
      (attachmentInResearchPlan) => attachmentInResearchPlan.identifier
    );

    if (!attachmentsToAdd) {
      return
    }

    attachmentsToAdd
      .filter((attachment) => idsOfAttachmentsInResearchPlan.includes(attachment.identifier))
      .map((source) => {
        const target = this.attachments
          .filter((attachInRP) => source.identifier === attachInRP.identifier);
        target[0].is_deleted = source.is_deleted;

        return source;
      });

    this.attachments = this.attachments.concat(attachmentsToAdd
      .filter((attachment) => !idsOfAttachmentsInResearchPlan.includes(attachment.identifier)));
  }

  markAttachmentAsDeleted(identifier) {
    if (!identifier) { return; }
    const attachmentToDelete = this.attachments
      .find((attachment) => attachment.identifier === identifier);

    if (attachmentToDelete) {
      attachmentToDelete.is_deleted = true;
      attachmentToDelete.is_image_field = true;
      this.markAttachmentAsDeleted(attachmentToDelete.ancestor);
    }
  }

  removeFieldFromBody(fieldId) {
    const index = this.body.findIndex((field) => field.id === fieldId);
    if (index === -1) { return; }

    if (this.body[index].value) {
      let { identifier } = this.body[index].value;
      if (!identifier) {
        identifier = this.body[index].value.public_name;
      }
      this.markAttachmentAsDeleted(identifier);
    }
    this.body.splice(index, 1);
    this.changed = true;
  }

  convertTemporaryImageFieldsInBody() {
    this.body
      .filter((field) => field.type === 'image')
      .map((field) => field.value)
      .filter((value) => value.identifier)
      .forEach((value) => {
        value.public_name = value.identifier;
        delete value.identifier;
        delete value.old_value;
      });
  }

  getAttachmentByIdentifier(identifier) {
    return this.attachments
      .filter((attachment) => attachment.identifier === identifier)[0];
  }

  getNewAttachments() {
    return (this.attachments || [])
      .filter((attachment) => attachment.is_new === true && !attachment.is_deleted);
  }

  getMarkedAsDeletedAttachments() {
    return (this.attachments || [])
      .filter((attachment) => attachment.is_deleted === true && !attachment.is_new);
  }

  buildCopy(params = {}) {
    const copy = super.buildCopy();
    Object.assign(copy, params);
    copy.attachments = this.attachments;
    copy.container = Container.init();
    copy.is_new = true;
    copy.is_copy = true;
    copy.can_update = true;
    copy.can_copy = true;

    return copy;
  }

  static copyFromResearchPlanAndCollectionId(research_plan, collection_id) {
    const attachments = research_plan.attachments.map(
      attach => Attachment.buildCopy(attach)
    );
    const params = {
      collection_id,
      name: research_plan.name,
      body: research_plan.body,
    }
    const copy = research_plan.buildCopy(params);
    copy.can_copy = false;
    copy.changed = true;
    copy.collection_id = collection_id;
    copy.mode = 'edit';
    copy.attachments = attachments;
    copy.origin = { id: research_plan.id };

    return copy;
  }
}
