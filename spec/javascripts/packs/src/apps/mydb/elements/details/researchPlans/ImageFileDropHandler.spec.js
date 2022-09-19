import expect from 'expect';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlan from 'src/models/ResearchPlan';
import Attachment from 'src/models/Attachment';
import ImageFileDropHandler from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ImageFileDropHandler';

Enzyme.configure({ adapter: new Adapter() });

describe('ImageFileDropHandler', () => {
  const attachmentNotInBody1 = new Attachment();
  const attachmentInBody = new Attachment();
  const attachmentInBodyButNoImage = new Attachment();

  it('drop first image', () => {
    createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);
    const file = { name: 'dummyFile', preview: 'publicName' };
    const filter = new ImageFileDropHandler();
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

  it('drop  image after another image dropped', () => {
    const rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);
    const file = { name: 'dummyFile', preview: 'publicName' };
    const file2 = { name: 'anotherDummyFile', preview: 'anotherPublicName' };

    const filter = new ImageFileDropHandler();
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

  function createRpWithBody(identifierImage, identifierNoImage) {
    const rp = ResearchPlan.buildEmpty();
    rp.body = [{
      id: 'entry-001',
      type: 'image',
      value: {
        file_name: 'xyz.png',
        public_name: identifierImage,
      }
    },
    {
      id: 'entry-003',
      type: 'no-image',
      value: {
        file_name: 'xyz.png',
        public_name: identifierNoImage
      }
    }];
    return rp;
  }
});
