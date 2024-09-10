import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

import {
  Accordion,
  Button,
} from 'react-bootstrap';

import Container from 'src/models/Container';
import ResearchPlan from 'src/models/ResearchPlan';

import ResearchPlanDetailsContainers
  from 'src/apps/mydb/elements/details/researchPlans/analysesTab/ResearchPlanDetailsContainers';

Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetailsContainers', () => {
  describe('when it does not have any analysis', () => {
    const researchPlan = ResearchPlan.buildEmpty();
    it('Render without any analysis and readonly', () => {
      const wrapper = shallow(<ResearchPlanDetailsContainers researchPlan={researchPlan} readOnly />);
      expect(wrapper.text()).toEqual(expect.stringContaining('There are currently no Analyses.'));
      expect(wrapper.find(Button)).toHaveLength(0);
    });

    it('Render without any analysis', () => {
      const wrapper = shallow(<ResearchPlanDetailsContainers researchPlan={researchPlan} readOnly={false} />);
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
        <ResearchPlanDetailsContainers researchPlan={researchPlan} readOnly={false} />
      );

      expect(wrapper.text()).toEqual(expect.stringContaining(
        `${analysis.name} - Type: ${analysis.extended_metadata.kind}`
      ));

      const button = wrapper.find(Accordion.Header).find(Button);
      expect(button.html()).toEqual(shallow(
        <Button
          className="ml-auto"
          size="sm"
          variant="danger"
        >
          <i className="fa fa-undo" />
        </Button>
      ).html());
    });
  });
});
