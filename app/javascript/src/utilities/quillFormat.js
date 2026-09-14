import _ from 'lodash';

const contentToText = (content) => {
  if (typeof (content) === 'undefined' || !content ||
    typeof (content.ops) === 'undefined' || !content.ops) {
    return '';
  }
  return (content.ops || []).reduce((txt, operation) => {
    if (typeof operation.insert !== 'string') { return txt + ' ' };
    return txt + operation.insert;
  }, '');
};

const keepSupSub = (value) => {
  const content = [];
  value.ops.forEach((op) => {
    if (typeof op.insert === 'string' && op.insert !== '\n') {
      if (op.attributes
            && op.attributes.script
            && (op.attributes.script === 'super'
                || op.attributes.script === 'sub')) {
        content.push({
          insert: op.insert,
          attributes: { script: op.attributes.script }
        });
      } else {
        content.push({ insert: op.insert });
      }
    }
  });
  content.filter(op => op).push({ insert: '\n' });
  // NB: what is this for?
  // if (content.length === 1) {
  //   content.unshift({ insert: '-' });
  // }
  return content;
};

// Image / file op detection across every shape this field has produced:
//   - legacy: op.insert.image (raw URL or object) and op.insert.file
//   - current: op.insert['attachment-image'] and op.insert['attachment-file']
//     (Quill Embed blots serialize under their blotName)
const getImagePayload = op => (
  op && op.insert && typeof op.insert === 'object'
    ? (op.insert['attachment-image'] || op.insert.image)
    : null
);
const getFilePayload = op => (
  op && op.insert && typeof op.insert === 'object'
    ? (op.insert['attachment-file'] || op.insert.file)
    : null
);
const isImageOp = op => !!getImagePayload(op);
const isFileOp = op => !!getFilePayload(op);

// Keep ops whose inserted image or file carries an `attachment_identifier` —
// those are real, first-class attachments backed by the polymorphic Attachment
// table. Only strip legacy raw image ops (base64 / dataURL / inline URL) that
// slipped in via paste before this feature existed.
const isAttachmentBackedOp = (op) => {
  const imagePayload = getImagePayload(op);
  if (imagePayload) return typeof imagePayload === 'object' && !!imagePayload.attachment_identifier;
  const filePayload = getFilePayload(op);
  if (filePayload) return typeof filePayload === 'object' && !!filePayload.attachment_identifier;
  return false;
};

const shouldStripOp = op => (isImageOp(op) || isFileOp(op)) && !isAttachmentBackedOp(op);

const stripImages = (value) => {
  if (!value) return value;
  if (Array.isArray(value)) return value.filter(op => !shouldStripOp(op));
  if (value.ops) return { ...value, ops: value.ops.filter(op => !shouldStripOp(op)) };
  return value;
};

const rmRedundantSpaceBreak = (target) => {
  return target.replace(/\n/g, '').replace(/\s\s+/g, ' ');
};

const rmOpsRedundantSpaceBreak = (ops) => {
  const clearOps = ops.map((op) => {
    op.insert = rmRedundantSpaceBreak(op.insert);
    return op;
  });
  return clearOps;
};

const rmDeltaRedundantSpaceBreak = (delta) => {
  const clearOps = rmOpsRedundantSpaceBreak(delta.ops);
  return { ops: clearOps };
};

const frontBreak = (content) => {
  const res = [{ insert: '\n' }, ...content];
  return res;
};

const mapValueToGroupRegex = (content, matchedGroup) => {
  let newContent = _.cloneDeep(content);
  matchedGroup.forEach((m, idx) => {
    newContent = newContent.map((d) => {
      const patt = `#{${idx + 1}}`;
      const insertString = d.insert;
      const dd = { ...d };
      dd.insert = insertString.replace(patt, m || '');
      return dd;
    });
  });

  return newContent;
};

export {
  contentToText,
  keepSupSub,
  rmDeltaRedundantSpaceBreak,
  rmOpsRedundantSpaceBreak,
  rmRedundantSpaceBreak,
  frontBreak,
  stripImages,
};
