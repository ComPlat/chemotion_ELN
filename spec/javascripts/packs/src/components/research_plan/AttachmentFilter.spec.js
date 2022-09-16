import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlan from 'src/models/ResearchPlan';
import Attachment from 'src/models/Attachment';
import AttachmentFilter from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/AttachmentFilter';



Enzyme.configure({ adapter: new Adapter() });

describe('AttachmentFilter', () => {

  let attachmentNotInBody1 = new Attachment();
  let attachmentInBody = new Attachment();
  let attachmentInBodyButNoImage = new Attachment();


  it('removeAttachmentsWhichAreInBody (no attachments)', () => {
    let rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);

    let filter = new AttachmentFilter();
    let filteredAttachments = filter.removeAttachmentsWhichAreInBody(rp.body, rp.attachments);
    expect(filteredAttachments.length).toEqual(0);
  });

  it('removeAttachmentsWhichAreInBody (no body)', () => {
    let rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);
    rp.attachments=[attachmentNotInBody1,attachmentInBody,attachmentInBodyButNoImage];

    let filter = new AttachmentFilter();
    let filteredAttachments = filter.removeAttachmentsWhichAreInBody({}, rp.attachments);
    expect(filteredAttachments.length).toEqual(3);
  });

  it('removeAttachmentsWhichAreInBody', () => {
    let attachmentNotInBody1 = new Attachment();
    let attachmentInBody = new Attachment();
    let attachmentInBodyButNoImage = new Attachment();
    let rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);
    rp.attachments=[attachmentNotInBody1,attachmentInBody,attachmentInBodyButNoImage];

    let filter = new AttachmentFilter();
    let filteredAttachments = filter.removeAttachmentsWhichAreInBody(rp.body, rp.attachments);
    expect(filteredAttachments.length).toEqual(2);
  });


});

function createRpWithBody(identifierImage, identifierNoImage) {
  let rp = ResearchPlan.buildEmpty();
  rp.body = [{
    "id": "entry-001",
    "type": "image",
    "value": {
      "file_name": "xyz.png",
      "public_name": identifierImage,
    }
  },
  {
    "id": "entry-003",
    "type": "no-image",
    "value": {
      "file_name": "xyz.png",
      "public_name": identifierNoImage
    }
  }];
  return rp;
}
