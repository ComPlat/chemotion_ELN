import Attachment from '@src/models/Attachment';
import ResearchPlan from '@src/models/ResearchPlan';
import expect from 'expect';
import {
  describe, it
} from 'mocha';

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

    it('without argument', () => {
      researchPlan.attachments = [attachmentInResearchPlan];
      researchPlan.upsertAttachments();
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

  describe('.convertTemporaryImageFieldsInBody', () => {
    const permanentBodyField = {
      id: 'normalizedBodyField',
      type: 'image',
      value: {
        file_name: 'xyz.png',
        public_name: 'xzy',
      }
    };

    const temporaryBodyField = {
      id: 'unnormalizedBodyField',
      type: 'image',
      value: {
        file_name: 'abc.png',
        public_name: 'abc',
        identifier: '123456',
        old_value: 'abcdef'
      }
    };

    it('with permanent body', () => {
      researchPlan.body = [permanentBodyField];
      researchPlan.convertTemporaryImageFieldsInBody();

      expect(researchPlan.body).toEqual([permanentBodyField]);
    });

    it('with temporary body', () => {
      const expected = {
        id: 'unnormalizedBodyField',
        type: 'image',
        value: {
          file_name: 'abc.png',
          public_name: '123456'
        }
      };

      researchPlan.body = [permanentBodyField, temporaryBodyField];
      researchPlan.convertTemporaryImageFieldsInBody();

      expect(researchPlan.body).toEqual([permanentBodyField, expected]);
    });
  });

  describe('.getNewAttachments', () => {
    describe('.with two new attachments but one is already deleted, one was already there', () => {
      const attachmentNewAndDeleted = new Attachment();
      const attachmentNew = new Attachment();
      const attachmentPresent = new Attachment();
      researchPlan.attachments = [attachmentNewAndDeleted, attachmentNew, attachmentPresent];
      attachmentNewAndDeleted.is_new = true;
      attachmentNewAndDeleted.is_deleted = true;

      attachmentNew.is_new = true;
      attachmentPresent.is_deleted = false;

      attachmentPresent.is_new = false;
      attachmentPresent.is_deleted = false;

      it('one attachment was found', () => {
        expect(researchPlan.getNewAttachments().length).toEqual(1);
      });
    });

    describe('.when attachment property is not defined', () => {
      it('empty array was returned', () => {
        const researchPlanWithoutAttachments = ResearchPlan.buildEmpty();
        delete (researchPlanWithoutAttachments.attachments);

        expect(researchPlanWithoutAttachments.getNewAttachments().length).toEqual(0);
      });
    });
  });

  describe('.getMarkedAsDeletedAttachments', () => {
    describe('.with two new attachments but one is already deleted, one was already there', () => {
      const attachmentNewAndDeleted = new Attachment();
      const attachmentNew = new Attachment();
      const attachmentPresent = new Attachment();
      researchPlan.attachments = [attachmentNewAndDeleted, attachmentNew, attachmentPresent];
      attachmentNewAndDeleted.is_new = true;
      attachmentNewAndDeleted.is_deleted = true;

      attachmentNew.is_new = true;
      attachmentPresent.is_deleted = false;

      attachmentPresent.is_new = false;
      attachmentPresent.is_deleted = false;

      it('one attachment was found', () => {
        expect(researchPlan.getNewAttachments().length).toEqual(1);
      });
    });
    describe('.when attachment property is not defined', () => {
      it('empty array was returned', () => {
        const researchPlanWithoutAttachments = ResearchPlan.buildEmpty();
        delete (researchPlanWithoutAttachments.attachments);

        expect(researchPlanWithoutAttachments.getNewAttachments().length).toEqual(0);
      });
    });
  });
});
