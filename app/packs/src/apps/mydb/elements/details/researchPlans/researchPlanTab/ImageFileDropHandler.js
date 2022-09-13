import Attachment from "src/models/Attachment";

export default class ImageFileDropHandler {

  handleDrop(files, replace, attachments) {
    let file = files[0];
    let attachment = Attachment.fromFile(file);
    attachment.ancestor = replace;
    attachment.is_image_field = true;
    attachments.push(attachment);
    let value = {
      file_name: attachment.name,
      public_name: file.preview,
      identifier: attachment.identifier,
      old_value: replace
    }
    return value;
  }


}