import expect from 'expect';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlan from 'src/models/ResearchPlan';
import Attachment from 'src/models/Attachment';
import ResearchPlanBodyOperation from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanBodyOperation';

Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanBodyOperation', () => {
  let operation = new ResearchPlanBodyOperation();




  it('remove body part (image) which was saved before', () => {
    let attachmentNotInBody = createAttachment();
    let attachmentInBody = createAttachment();
    let attachmentInBodyButNoImage = createAttachment();
    let rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier)
    rp.addAttachments([attachmentNotInBody, attachmentInBody, attachmentInBodyButNoImage]);
    operation.deleteBodyPart("entry-001", rp);

    expect(rp.attachments[0].is_deleted).toEqual(false);
    expect(rp.attachments[1].is_deleted).toEqual(true);
    expect(rp.attachments[2].is_deleted).toEqual(false);
    expect(rp.body.length).toEqual(2);
  });

  it('remove temporary body part (image)', () => {
    let attachmentNotInBody = createAttachment();
    let attachmentInBody = createAttachment();
    let attachmentInBodyButNoImage = createAttachment();
    let rp = createRpWithBodyWithTmpEntry(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier)
    rp.addAttachments([attachmentNotInBody, attachmentInBody, attachmentInBodyButNoImage]);
    operation.deleteBodyPart("entry-001", rp);

    expect(rp.attachments[0].is_deleted).toEqual(false);
    expect(rp.attachments[1].is_deleted).toEqual(true);
    expect(rp.attachments[2].is_deleted).toEqual(false);
    expect(rp.body.length).toEqual(1);
  });

  it('remove temporary body part (image) after replacing another image', () => {
    let attachmentInBody = createAttachment();
    let attachmentNotInBody = createAttachment();
    attachmentInBody.ancestor = attachmentNotInBody.identifier;
    let attachmentInBodyButNoImage = createAttachment();

    let rp = createRpWithBodyWithTmpEntry(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier)
    rp.addAttachments([attachmentNotInBody, attachmentInBody, attachmentInBodyButNoImage]);
    operation.deleteBodyPart("entry-001", rp);

    expect(rp.attachments[0].is_deleted).toEqual(true);
    expect(rp.attachments[1].is_deleted).toEqual(true);
    expect(rp.attachments[2].is_deleted).toEqual(false);
    expect(rp.body.length).toEqual(1);
  });

  it('remove body part (no image)', () => {
    let attachmentInBody = createAttachment();
    let attachmentNotInBody = createAttachment();
    let attachmentInBodyButNoImage = createAttachment();

    let rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier)
    rp.addAttachments([attachmentNotInBody, attachmentInBody, attachmentInBodyButNoImage]);
    operation.deleteBodyPart("entry-002", rp);

    expect(rp.attachments[0].is_deleted).toEqual(false);
    expect(rp.attachments[1].is_deleted).toEqual(false);
    expect(rp.attachments[2].is_deleted).toEqual(false);
    expect(rp.body.length).toEqual(2);
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
    "id": "entry-002",
    "type": "no-image",
    "value": {}
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

function createRpWithBodyWithTmpEntry(identifierImage, identifierNoImage) {
  let rp = ResearchPlan.buildEmpty();
  rp.body = [{
    "id": "entry-001",
    "type": "image",
    "value": {
      "file_name": "xyz.png",
      "public_name": "blob://whatever",
      "identifier": identifierImage
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

function createAttachment() {
  let attachment = new Attachment();
  attachment.is_deleted = false;
  return attachment;
}
