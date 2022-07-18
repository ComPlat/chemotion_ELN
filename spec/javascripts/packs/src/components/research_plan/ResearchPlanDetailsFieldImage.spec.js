import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import ResearchPlanDetailsFieldImage from '../../../../../../app/packs/src/components/research_plan/ResearchPlanDetailsFieldImage';
import ResearchPlan from '../../../../../../app/packs/src/components/models/ResearchPlan';



Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetailsFieldImage', () => {
  const wrapper = rpFieldImage => shallow(<ResearchPlanDetailsFieldImage/>);
  it('just a test', () => {

      let rp= ResearchPlan.buildEmpty();

      rp.field.value={};
      rp.field.value.public_name="undefined";
      expect(<ResearchPlanDetailsFieldImage field={field}/>).toBeDefined();
      let a=wrapper();
      expect(wrapper.instance().test()).toEqual("Hallo");
  });

});