import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

import { Button } from 'react-bootstrap';

import Container from '@src/models/Container';
import ResearchPlan from '@src/models/ResearchPlan';
import AccordionHeaderWithButtons from '@src/components/common/AccordionHeaderWithButtons';

import ResearchPlanDetailsContainers
  from '@src/apps/mydb/elements/details/researchPlans/analysesTab/ResearchPlanDetailsContainers';

Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetailsContainers', () => {
  describe('when it does not have any analysis', () => {
    const researchPlan = ResearchPlan.buildEmpty();
    it('Render without any analysis and readonly', () => {
      const wrapper = shallow(React.createElement(ResearchPlanDetailsContainers, { researchPlan: researchPlan, readOnly: true }));
      expect(wrapper.text()).toEqual(expect.stringContaining('There are currently no Analyses.'));
      expect(wrapper.find(Button)).toHaveLength(0);
    });

    it('Render without any analysis', () => {
      const wrapper = shallow(React.createElement(ResearchPlanDetailsContainers, { researchPlan: researchPlan, readOnly: false }));
      expect(wrapper.text()).toEqual(expect.stringContaining('There are currently no Analyses.'));
      const button = wrapper.find(Button);
      expect(button.text()).toEqual('Add analysis');
    });
  });

  describe('when it has analyses', () => {
    let researchPlan = null;

    beforeEach(() => {
      researchPlan = ResearchPlan.buildEmpty();
    });

    afterEach(() => {
      researchPlan = null;
    });

    it('Render with analysis is deleted', () => {
      const analysis = Container.buildAnalysis();
      analysis.is_deleted = true;
      researchPlan.container.children[0].children.push(analysis);

      const wrapper = shallow(
        React.createElement(ResearchPlanDetailsContainers, { researchPlan: researchPlan, readOnly: false })
      );

      const deletedHeader = wrapper.find(AccordionHeaderWithButtons).shallow().find('strike');
      expect(deletedHeader.text()).toContain(analysis.name);

      const button = wrapper.find(AccordionHeaderWithButtons).find(Button);
      expect(button.html()).toEqual(shallow(
        React.createElement(Button, { className: "ms-auto", size: "xsm", variant: "danger" }, 
          React.createElement("i", { className: "fa fa-undo" })
        )
      ).html());
    });
  });
});
