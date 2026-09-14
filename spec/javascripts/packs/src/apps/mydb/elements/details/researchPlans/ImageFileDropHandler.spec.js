import expect from 'expect';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlan from 'src/models/ResearchPlan';
import Attachment from 'src/models/Attachment';
import ImageFileDropHandler from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ImageFileDropHandler';

Enzyme.configure({ adapter: new Adapter() });

// URL.createObjectURL is a browser API; stub for the node test env.
if (typeof global.URL === 'undefined') global.URL = {};
global.URL.createObjectURL = () => 'blob:test-created';
global.URL.revokeObjectURL = () => {};

describe('ImageFileDropHandler', () => {
  const attachmentInBody = new Attachment();
  const attachmentInBodyButNoImage = new Attachment();
  const filter = new ImageFileDropHandler();
  const researchPlan = ResearchPlan.buildEmpty();

  describe('.handleDrop', () => {
    const fieldWithImage = {
      id: 'entry-001',
      type: 'image',
      value: {
        file_name: 'xyz.png',
        public_name: attachmentInBody.identifier,
      },
    };

    const fieldWithoutImage = {
      id: 'entry-003',
      type: 'no-image',
      value: {
        file_name: 'xyz.png',
        public_name: attachmentInBodyButNoImage.identifier,
      },
    };

    it('drop first image', () => {
      const replacedFieldWasEmpty = {
        value: { file_name: null, public_name: null, zoom: null },
      };
      researchPlan.body = [fieldWithImage, fieldWithoutImage];
      const file = new File([''], 'dummyFile', { type: 'image/png' });

      const { nextAttachments, fieldValue } = filter.handleDrop([file], replacedFieldWasEmpty, []);

      expect(nextAttachments.length).toEqual(1);
      expect(nextAttachments[0].is_image_field).toEqual(true);
      expect(nextAttachments[0].ancestor).toBeUndefined();

      expect(fieldValue.identifier).toEqual(nextAttachments[0].identifier);
      expect(fieldValue.public_name).toEqual('blob:test-created');
      expect(fieldValue.file_name).toEqual('dummyFile');
      expect(fieldValue.old_value).toEqual(replacedFieldWasEmpty);
    });

    it('drop image after another image dropped', () => {
      const replacedAttachment = new Attachment();
      replacedAttachment.name = 'replacedFile.png';

      const replacedFieldTemporayImage = {
        value: {
          file_name: replacedAttachment.name,
          public_name: 'blob://http://...',
          identifier: replacedAttachment.identifier,
        },
      };

      researchPlan.body = [fieldWithImage, fieldWithoutImage];
      researchPlan.attachments = [replacedAttachment];
      const droppedFile = new File([''], 'dummyFile', { type: 'image/png' });

      const { nextAttachments, fieldValue } = filter.handleDrop(
        [droppedFile], replacedFieldTemporayImage, researchPlan.attachments,
      );

      expect(nextAttachments.length).toEqual(2);
      expect(nextAttachments[0].is_deleted).toEqual(true);
      expect(nextAttachments[1].is_image_field).toEqual(true);
      expect(nextAttachments[1].is_deleted).toEqual(false);
      expect(nextAttachments[1].ancestor).toEqual(nextAttachments[0].identifier);

      expect(fieldValue.identifier).toEqual(nextAttachments[1].identifier);
      expect(fieldValue.public_name).toEqual('blob:test-created');
      expect(fieldValue.file_name).toEqual('dummyFile');
      expect(fieldValue.old_value).toEqual(replacedFieldTemporayImage);
    });

    it('drop image on image which is saved on server', () => {
      const replacedAttachment = new Attachment();
      replacedAttachment.name = 'replacedFile.png';

      const replacedFieldTemporayImage = {
        value: {
          file_name: replacedAttachment.name,
          public_name: replacedAttachment.identifier,
        },
      };

      researchPlan.body = [fieldWithImage, fieldWithoutImage];
      researchPlan.attachments = [replacedAttachment];
      const droppedFile = new File([''], 'dummyFile', { type: 'image/png' });

      const { nextAttachments, fieldValue } = filter.handleDrop(
        [droppedFile], replacedFieldTemporayImage, researchPlan.attachments,
      );

      expect(nextAttachments.length).toEqual(2);
      expect(nextAttachments[0].is_deleted).toEqual(true);
      expect(nextAttachments[1].is_image_field).toEqual(true);
      expect(nextAttachments[1].is_deleted).toEqual(false);
      expect(nextAttachments[1].ancestor).toEqual(nextAttachments[0].identifier);

      expect(fieldValue.identifier).toEqual(nextAttachments[1].identifier);
      expect(fieldValue.public_name).toEqual('blob:test-created');
      expect(fieldValue.file_name).toEqual('dummyFile');
      expect(fieldValue.old_value).toEqual(replacedFieldTemporayImage);
    });
  });
});
