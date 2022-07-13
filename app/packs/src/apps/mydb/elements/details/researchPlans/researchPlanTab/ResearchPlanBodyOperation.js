export default class ResearchPlanBodyOperation {

  deleteBodyPart(bodyPartId, researchPlan) {
    const index = researchPlan.body.findIndex(field => field.id === bodyPartId);
    let identifier = researchPlan.body[index].value.identifier;
    if (!identifier) {
      identifier = researchPlan.body[index].value.public_name;
    }
    this.markAttachmentDeleted(identifier, researchPlan.attachments)
    researchPlan.body.splice(index, 1);
    researchPlan.changed = true;
  }

  markAttachmentDeleted(identifier, attachments) {
    if (!identifier) { return; }
    let attachment = this.getAttachmentByIdentifier(attachments, identifier)
    if (attachment) {
      attachment.is_deleted = true;
      attachment.is_image_field = true;
      this.markAttachmentDeleted(attachment.ancestor, attachments)
    }
  }

  getAttachmentByIdentifier(attachments, identifier) {
    for (let i = 0; i < attachments.length; i++) {
      if (attachments[i].identifier === identifier) {
        return attachments[i]
      }
    }
  }
}