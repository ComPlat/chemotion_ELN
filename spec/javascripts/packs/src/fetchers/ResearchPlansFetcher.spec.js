
import expect from 'expect';
import ResearchPlan from 'src/models/ResearchPlan';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';


describe('ResearchPlansFetcher', () => {


  it('updateBodyInformationOfImages', () => {
    let rp=createRpWithBody();
    rp = ResearchPlansFetcher.updateBodyInformationOfImages(rp);
    expect(rp.body[0].value.public_name).toEqual("entry-001-correctId");
    expect(rp.body[0].value.identifier).toEqual(undefined);
    expect(rp.body[1].value.public_name).toEqual("entry-002-correctId");
    expect(rp.body[1].value.identifier).toEqual(undefined);
    expect(rp.body[2].value.public_name).toEqual("entry-003-fakteData");
    expect(rp.body[2].value.identifier).toEqual("entry-003-anotherFakeData");
  });
});

const createRpWithBody = () => {
  let rp = ResearchPlan.buildEmpty();
  rp.body = [{
    "id": "entry-001",
    "type": "image",
    "value": {
      "file_name": "xyz.png",
      "public_name": "UUID should be replaced",
      "identifier": "entry-001-correctId"
    }
  },
  {
    "id": "entry-002",
    "type": "image",
    "value": {
      "file_name": "xyz.png",
      "public_name": "entry-002-correctId"
    }
  },
  {
    "id": "entry-003",
    "type": "no-image",
    "value": {
      "file_name": "xyz.png",
      "public_name": "entry-003-fakteData",
      "identifier": "entry-003-anotherFakeData"
    }
  }];
  return rp;
};
