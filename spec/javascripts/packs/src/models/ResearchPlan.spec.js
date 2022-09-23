import Attachment from 'src/models/Attachment';
import ResearchPlan from 'src/models/ResearchPlan';
import expect from 'expect';

describe('ResearchPlan', () => {
  const researchPlan = ResearchPlan.buildEmpty();

  describe('.upsertAttachments', () => {
    const attachmentNotInResearchPlan = new Attachment();
    const attachmentInResearchPlan = new Attachment();

    it('with empty list', () => {
      researchPlan.attachments = [attachmentInResearchPlan];
      researchPlan.upsertAttachments([]);
      expect(researchPlan.attachments.length).toEqual(1);
    });

    it('with two attachments, one already present in researchplan', () => {
      attachmentInResearchPlan.is_deleted = false;
      researchPlan.attachments = [attachmentInResearchPlan];
      const attachmentInResearchPlanCopy = new Attachment();
      attachmentInResearchPlanCopy.identifier = attachmentInResearchPlan.identifier;
      attachmentInResearchPlanCopy.is_deleted = true;
      researchPlan.upsertAttachments([attachmentNotInResearchPlan, attachmentInResearchPlanCopy]);

      expect(researchPlan.attachments.length).toEqual(2);
      expect(researchPlan.attachments[0].id).toEqual(attachmentInResearchPlan.id);
      expect(researchPlan.attachments[0].is_deleted).toEqual(true);
      expect(researchPlan.attachments[1].id).toEqual(attachmentNotInResearchPlan.id);
    });
  });

  describe('.markAttachmentAsDeleted', () => {
    const attachmentNotToDelete = new Attachment();

    it('on existing attachment', () => {
      const attachmentToDelete = new Attachment();
      researchPlan.attachments = [attachmentToDelete, attachmentNotToDelete];
      researchPlan.markAttachmentAsDeleted(attachmentToDelete.identifier);
      expect(attachmentToDelete.is_deleted).toEqual(true);
      expect(attachmentToDelete.is_image_field).toEqual(true);

      expect(attachmentNotToDelete.is_deleted).toEqual(undefined);
      expect(attachmentNotToDelete.is_image_field).toEqual(undefined);
    });

    it('on existing attachment with ancestors', () => {
      const attachmentToDelete = new Attachment();
      const attachmentToDeleteWithAncestor = new Attachment();
      attachmentToDeleteWithAncestor.ancestor = attachmentToDelete.identifier;
      researchPlan.attachments = [
        attachmentToDelete,
        attachmentNotToDelete,
        attachmentToDeleteWithAncestor];
      researchPlan.markAttachmentAsDeleted(attachmentToDeleteWithAncestor.identifier);

      expect(attachmentToDelete.is_deleted).toEqual(true);
      expect(attachmentToDelete.is_image_field).toEqual(true);

      expect(attachmentNotToDelete.is_deleted).toEqual(undefined);
      expect(attachmentNotToDelete.is_image_field).toEqual(undefined);

      expect(attachmentToDeleteWithAncestor.is_deleted).toEqual(true);
      expect(attachmentToDeleteWithAncestor.is_image_field).toEqual(true);
    });

    it('on non existing attachment', () => {
      researchPlan.attachments = [attachmentNotToDelete];
      researchPlan.markAttachmentAsDeleted('noValideIdentifier');
      expect(attachmentNotToDelete.is_deleted).toEqual(undefined);
      expect(attachmentNotToDelete.is_image_field).toEqual(undefined);
    });
  });

  describe('.removeFieldFromBody', () => {
    const attachmentToDelete = new Attachment();
    const attachmentNotToDelete = new Attachment();
    const bodyFieldWithoutImage = {
      id: 'entry-002',
      type: 'no-image',
      value: {}
    };

    it('on non existing field', () => {
      researchPlan.attachments = [attachmentNotToDelete];
      const jsonBody = JSON.stringify(researchPlan.body);
      researchPlan.removeFieldFromBody('noValideFieldId');

      expect(JSON.stringify(researchPlan.body)).toEqual(jsonBody);
    });

    it('on existing field without attachments', () => {
      const bodyFieldWithImage = {
        id: 'entry-001',
        type: 'image',
        value: {
          file_name: 'xyz.png',
          public_name: attachmentNotToDelete.identifier,
        }
      };
      researchPlan.attachments = [attachmentNotToDelete];
      researchPlan.body = [bodyFieldWithImage, bodyFieldWithoutImage];

      researchPlan.removeFieldFromBody('entry-002');

      expect(attachmentNotToDelete.is_deleted).toEqual(undefined);
      expect(attachmentNotToDelete.is_image_field).toEqual(undefined);
      expect(researchPlan.body).toEqual([bodyFieldWithImage]);
    });

    it('on existing field with attachments', () => {
      const bodyFieldWithImage = {
        id: 'entry-001',
        type: 'image',
        value: {
          file_name: 'xyz.png',
          public_name: attachmentToDelete.identifier,
        }
      };
      researchPlan.attachments = [attachmentToDelete, attachmentNotToDelete];
      researchPlan.body = [bodyFieldWithImage, bodyFieldWithoutImage];

      researchPlan.removeFieldFromBody('entry-001');

      expect(attachmentToDelete.is_deleted).toEqual(true);
      expect(attachmentToDelete.is_image_field).toEqual(true);
      expect(attachmentNotToDelete.is_deleted).toEqual(undefined);
      expect(attachmentNotToDelete.is_image_field).toEqual(undefined);
      expect(researchPlan.body).toEqual([bodyFieldWithoutImage]);
    });
  });
});
