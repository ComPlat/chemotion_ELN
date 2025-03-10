import expect from 'expect';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlan from '@src/models/ResearchPlan';
import Attachment from '@src/models/Attachment';
import ImageAttachmentFilter from '@src/utilities/ImageAttachmentFilter';

Enzyme.configure({ adapter: new Adapter() });

describe('ImageAttachmentFilter', () => {
  const attachmentNotInBody1 = new Attachment();
  const attachmentInBody = new Attachment();
  const attachmentInBodyButNoImage = new Attachment();
  describe('.filterAttachmentsWhichAreInBody', () => {
    it('filterAttachmentsWhichAreInBody (no attachments)', () => {
      const rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);

      const filter = new ImageAttachmentFilter();
      const filteredAttachments = filter.filterAttachmentsWhichAreInBody(rp.body, rp.attachments);
      expect(filteredAttachments.length).toEqual(0);
    });

    it('filterAttachmentsWhichAreInBody (no body)', () => {
      const rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);
      rp.attachments = [attachmentNotInBody1, attachmentInBody, attachmentInBodyButNoImage];

      const filter = new ImageAttachmentFilter();
      const filteredAttachments = filter.filterAttachmentsWhichAreInBody([], rp.attachments);
      expect(filteredAttachments.length).toEqual(3);
    });

    it('filterAttachmentsWhichAreInBody', () => {
      const attachmentNotInBody1 = new Attachment();
      const attachmentInBody = new Attachment();
      const attachmentInBodyButNoImage = new Attachment();
      const rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);
      rp.attachments = [attachmentNotInBody1, attachmentInBody, attachmentInBodyButNoImage];

      const filter = new ImageAttachmentFilter();
      const filteredAttachments = filter.filterAttachmentsWhichAreInBody(rp.body, rp.attachments);
      expect(filteredAttachments.length).toEqual(2);
    });
  });
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
