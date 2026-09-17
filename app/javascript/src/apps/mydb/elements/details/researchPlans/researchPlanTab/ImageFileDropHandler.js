import { replaceInlineImageAttachment, revokeTransientBlob } from 'src/utilities/attachmentUtils';

export default class ImageFileDropHandler {
  handleDrop(files, replace, attachments) {
    const ancestor = this.getIdentifierOfAncestor(replace.value);
    const { attachments: nextAttachments, newAttachment } =
      replaceInlineImageAttachment(attachments, files[0], ancestor);
    revokeTransientBlob(replace.value);
    return {
      nextAttachments,
      fieldValue: {
        file_name: newAttachment.name,
        public_name: URL.createObjectURL(files[0]),
        identifier: newAttachment.identifier,
        old_value: replace,
      },
    };
  }

  getIdentifierOfAncestor(valueOfField) {
    if (!valueOfField) return null;
    if (valueOfField.identifier) return valueOfField.identifier;
    if (valueOfField.public_name) return valueOfField.public_name;
    return null;
  }
}
