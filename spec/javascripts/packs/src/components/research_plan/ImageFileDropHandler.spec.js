import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import ResearchPlan from '../../../../../../app/packs/src/components/models/ResearchPlan';
import Attachment from '../../../../../../app/packs/src/components/models/Attachment';
import AttachmentFilter from '../../../../../../app/packs/src/components/research_plan/AttachmentFilter';
import ImageFileDropHandler from '../../../../../../app/packs/src/components/research_plan/ImageFileDropHandler';



Enzyme.configure({ adapter: new Adapter() });

describe('ImageFileDropHandler', () => {

  let attachmentNotInBody1 = new Attachment();
  let attachmentInBody = new Attachment();
  let attachmentInBodyButNoImage = new Attachment();


  it('drop first image', () => {
    let rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);
    let file = { name: "dummyFile", preview: "publicName" };
    let filter = new ImageFileDropHandler();
    let attachments = [];
    let value = filter.handleDrop([file], undefined, attachments);
    expect(attachments.length).toEqual(1);
    expect(attachments[0].is_image_field).toEqual(true);
    expect(attachments[0].ancestor).toEqual(undefined);

    expect(value.identifier).toEqual(attachments[0].identifier)
    expect(value.public_name).toEqual("publicName")
    expect(value.file_name).toEqual("dummyFile")
    expect(value.old_value).toEqual(undefined)
  });

  it('drop  image after another image dropped', () => {
    let rp = createRpWithBody(attachmentInBody.identifier, attachmentInBodyButNoImage.identifier);
    let file = { name: "dummyFile", preview: "publicName" };
    let file2 = { name: "anotherDummyFile", preview: "anotherPublicName" };

    let filter = new ImageFileDropHandler();
    let attachments = [];

    filter.handleDrop([file], undefined, attachments);
    let value = filter.handleDrop([file2], attachments[0].identifier, attachments);

    expect(attachments.length).toEqual(2);
    expect(attachments[0].is_image_field).toEqual(true);
    expect(attachments[0].ancestor).toEqual(undefined);
    expect(attachments[1].is_image_field).toEqual(true);
    expect(attachments[1].ancestor).toEqual(attachments[0].identifier);

    expect(value.identifier).toEqual(attachments[1].identifier)
    expect(value.public_name).toEqual("anotherPublicName")
    expect(value.file_name).toEqual("anotherDummyFile")
    expect(value.old_value).toEqual(attachments[0].identifier)
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
});
