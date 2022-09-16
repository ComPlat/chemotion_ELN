import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlanDetailsFieldImage from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldImage';
import ResearchPlan from 'src/models/ResearchPlan';

Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetailsFieldImage', () => {

  it('no image choosen (static)', () => {
    let rp = ResearchPlan.buildEmpty();

    rp.value = {};
    rp.value.public_name = null;

    let wrapper = shallow(<ResearchPlanDetailsFieldImage field={rp} />);

    expect(wrapper.find("img").length).toEqual(0);
  });

  it('temporary image in blob (static)', () => {
    let rp = ResearchPlan.buildEmpty();

    rp.value = {};
    rp.value.public_name = "blob://...";
    rp.value.file_name = "myFile.png";

    let wrapper = shallow(<ResearchPlanDetailsFieldImage field={rp} />);

    expect(wrapper.find("img").length).toEqual(1);
    expect(wrapper.find('img').prop('src')).toEqual("blob://...");
  });

  it('deprecated image (static)', () => {
    let rp = ResearchPlan.buildEmpty();

    rp.value = {};
    rp.value.public_name = "xxx.png";
    rp.value.file_name = "xxx.png";

    let wrapper = shallow(<ResearchPlanDetailsFieldImage field={rp} />);

    expect(wrapper.find("img").length).toEqual(1);
    expect(wrapper.find('img').prop('src')).toEqual("/images/research_plans/xxx.png");
  });

  it('image from attachment on server (static)', () => {
    let rp = ResearchPlan.buildEmpty();

    rp.value = {};
    rp.value.public_name = "xxx";
    rp.value.file_name = "xxx";

    let wrapper = shallow(<ResearchPlanDetailsFieldImage
      field={rp}
      fetchImageBlob={(public_name) => { const promise = () => {return Promise.resolve('A');}}
      } />);

    expect(wrapper.find("img").length).toEqual(1);
    expect(wrapper.find('img').prop('src')).toEqual("undefined");
  });

});
