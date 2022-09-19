import expect from 'expect';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlan from 'src/models/ResearchPlan';
import Attachment from 'src/models/Attachment';
import ImageFileDropHandler from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ImageFileDropHandler';

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
    it('drop first image', () => {
      researchPlan.body = [fieldWithImage, fieldWithoutImage];
      const file = { name: 'dummyFile', preview: 'publicName' };

      const attachments = [];
      const value = filter.handleDrop([file], undefined, attachments);
      expect(attachments.length).toEqual(1);
      expect(attachments[0].is_image_field).toEqual(true);
      expect(attachments[0].ancestor).toEqual(undefined);

      expect(value.identifier).toEqual(attachments[0].identifier);
      expect(value.public_name).toEqual('publicName');
      expect(value.file_name).toEqual('dummyFile');
      expect(value.old_value).toEqual(undefined);
    });

    it('drop image after another image dropped', () => {
      researchPlan.body = [fieldWithImage, fieldWithoutImage];
      const file = { name: 'dummyFile', preview: 'publicName' };
      const file2 = { name: 'anotherDummyFile', preview: 'anotherPublicName' };
      const attachments = [];

      filter.handleDrop([file], undefined, attachments);
      const value = filter.handleDrop([file2], attachments[0].identifier, attachments);

      expect(attachments.length).toEqual(2);
      expect(attachments[0].is_image_field).toEqual(true);
      expect(attachments[0].ancestor).toEqual(undefined);
      expect(attachments[1].is_image_field).toEqual(true);
      expect(attachments[1].ancestor).toEqual(attachments[0].identifier);

      expect(value.identifier).toEqual(attachments[1].identifier);
      expect(value.public_name).toEqual('anotherPublicName');
      expect(value.file_name).toEqual('anotherDummyFile');
      expect(value.old_value).toEqual(attachments[0].identifier);
    });
  });
});
