export default class ImageAttachmentFilter {
  filterAttachmentsWhichAreInBody(rpBody, attachments) {
    const uuidsOfImageAttachments = rpBody
      .filter((field) => field.type === 'image')
      .map((field) => field.value.public_name);
    return attachments.filter(
      (attachment) => !uuidsOfImageAttachments.includes(attachment.identifier)
    );
  }
}
