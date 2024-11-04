import Attachment from 'src/models/Attachment';

export default class ImageFileDropHandler {
  handleDrop(files, replace, attachments) {
    const identifierOfAncestor = this.getIdentifierOfAncestor(replace.value);

    const attachmentFromFile = this.createAttachmentFromFile(files[0], identifierOfAncestor);
    attachments.push(attachmentFromFile);

    attachments
      .filter((attachment) => attachment.identifier === identifierOfAncestor)
      .map((attachment) => {
        attachment.is_deleted = true;
        attachment.is_new = Number.isNaN(attachment.id);
        return attachment;
      });

    const value = {
      file_name: attachmentFromFile.name,
      public_name: files[0].preview,
      identifier: attachmentFromFile.identifier,
      old_value: replace
    };
    return value;
  }

  getIdentifierOfAncestor(valueOfField) {
    let identifierOfAncestor = null;
    if (valueOfField.identifier) {
      identifierOfAncestor = valueOfField.identifier;
    } else if (valueOfField.public_name) {
      identifierOfAncestor = valueOfField.public_name;
    }
    return identifierOfAncestor;
  }

  createAttachmentFromFile(file, identifierOfAncestor) {
    const attachmentFromFile = Attachment.fromFile(file);
    attachmentFromFile.ancestor = identifierOfAncestor;
    attachmentFromFile.is_image_field = true;
    return attachmentFromFile;
  }
}
