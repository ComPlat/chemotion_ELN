export default class AttachmentFilter {

  removeAttachmentsWhichAreInBody(rpBody, attachments) {
    let attachmentsCopy= attachments.map((x) => x);
    let uuidsToSubstract = this.getUUIDsfromBody(rpBody);
    attachmentsCopy = this.filterAttachments(attachmentsCopy, uuidsToSubstract);
    return attachmentsCopy;
  }

  filterAttachments(attachments, uuidsToSubstract) {
    for (let i = attachments.length - 1; i >= 0; i--) {
      let attachment = attachments[i];

      if (uuidsToSubstract.includes(attachment.identifier)) {
        attachments.splice(i,1);
      }
    }
    return attachments;
  }

  getUUIDsfromBody(rpBody) {
    let uuidsToSubstract = [];
    for (let i = 0; i < rpBody.length; i++) {
      if (rpBody[i]['type'] == 'image') {
        uuidsToSubstract.push(rpBody[i]['value']['public_name']);
      }
    }

    return uuidsToSubstract;
  }
}