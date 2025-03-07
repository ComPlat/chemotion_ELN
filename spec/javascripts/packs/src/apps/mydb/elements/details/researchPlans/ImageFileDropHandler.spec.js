import expect from 'expect';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlan from '@src/models/ResearchPlan';
import Attachment from '@src/models/Attachment';
import ImageFileDropHandler from '@src/apps/mydb/elements/details/researchPlans/researchPlanTab/ImageFileDropHandler';

Enzyme.configure({ adapter: new Adapter() });

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
      }
    };

    const fieldWithoutImage = {
      id: 'entry-003',
      type: 'no-image',
      value: {
        file_name: 'xyz.png',
        public_name: attachmentInBodyButNoImage.identifier
      }
    };
    it('drop first image', async () => {
      const replacedFieldWasEmpty = {
        value: {
          file_name: null,
          public_name: null,
          zoom: null
        }
      };
      researchPlan.body = [fieldWithImage, fieldWithoutImage];
      const file = { name: 'dummyFile', preview: 'publicName' };

      const attachments = [];
      const value = filter.handleDrop([file], replacedFieldWasEmpty, attachments);

      expect(attachments.length).toEqual(1);
      expect(attachments[0].is_image_field).toEqual(true);
      expect(attachments[0].ancestor).toEqual(null);

      expect(value.identifier).toEqual(attachments[0].identifier);
      expect(value.public_name).toEqual('publicName');
      expect(value.file_name).toEqual('dummyFile');
      expect(value.old_value).toEqual(replacedFieldWasEmpty);
    });

    it('drop image after another image dropped', () => {
      const replacedAttachment = new Attachment();
      replacedAttachment.name = 'replacedFile.png';

      const replacedFieldTemporayImage = {
        value: {
          file_name: replacedAttachment.name,
          public_name: 'blob://http://...',
          identifier: replacedAttachment.identifier
        }
      };

      researchPlan.body = [fieldWithImage, fieldWithoutImage];
      researchPlan.attachments = [replacedAttachment];
      const dropedFile = { name: 'dummyFile', preview: 'anotherPublicName' };

      const value = filter.handleDrop(
        [dropedFile],
        replacedFieldTemporayImage,
        researchPlan.attachments
      );

      expect(researchPlan.attachments.length).toEqual(2);
      expect(researchPlan.attachments[0].is_deleted).toEqual(true);
      expect(researchPlan.attachments[1].is_image_field).toEqual(true);
      expect(researchPlan.attachments[1].is_deleted).toEqual(false);
      expect(researchPlan.attachments[1].ancestor).toEqual(researchPlan.attachments[0].identifier);

      expect(value.identifier).toEqual(researchPlan.attachments[1].identifier);
      expect(value.public_name).toEqual('anotherPublicName');
      expect(value.file_name).toEqual('dummyFile');
      expect(value.old_value).toEqual(replacedFieldTemporayImage);
    });

    it('drop image on image which is saved on server', () => {
      const replacedAttachment = new Attachment();
      replacedAttachment.name = 'replacedFile.png';

      const replacedFieldTemporayImage = {
        value: {
          file_name: replacedAttachment.name,
          public_name: replacedAttachment.identifier
        }
      };

      researchPlan.body = [fieldWithImage, fieldWithoutImage];
      researchPlan.attachments = [replacedAttachment];

      const dropedFile = { name: 'dummyFile', preview: 'anotherPublicName' };

      const value = filter.handleDrop(
        [dropedFile],
        replacedFieldTemporayImage,
        researchPlan.attachments
      );

      expect(researchPlan.attachments.length).toEqual(2);
      expect(researchPlan.attachments[0].is_deleted).toEqual(true);
      expect(researchPlan.attachments[1].is_image_field).toEqual(true);
      expect(researchPlan.attachments[1].is_deleted).toEqual(false);
      expect(researchPlan.attachments[1].ancestor).toEqual(researchPlan.attachments[0].identifier);

      expect(value.identifier).toEqual(researchPlan.attachments[1].identifier);
      expect(value.public_name).toEqual('anotherPublicName');
      expect(value.file_name).toEqual('dummyFile');
      expect(value.old_value).toEqual(replacedFieldTemporayImage);
    });
  });
});
