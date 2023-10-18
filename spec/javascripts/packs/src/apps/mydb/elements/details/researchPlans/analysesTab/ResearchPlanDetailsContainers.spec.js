import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

import {
  PanelGroup,
  Panel,
  Button,
} from 'react-bootstrap';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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
      const expectedValue = shallow(
        <div
          style={{ marginBottom: '10px' }}
          className="noAnalyses-warning"
        >
          There are currently no Analyses.
          <span />
        </div>
      );
      expect(wrapper.html()).toEqual(expectedValue.html());
    });

    it('Render without any analysis', () => {
      const wrapper = shallow(<ResearchPlanDetailsContainers researchPlan={researchPlan} readOnly={false} />);
      const expectedValue = shallow(
        <div
          style={{ marginBottom: '10px' }}
          className="noAnalyses-warning"
        >
          There are currently no Analyses.
          <Button
            className="button-right"
            bsSize="xsmall"
            bsStyle="success"
          >
            Add analysis
          </Button>
        </div>
      );
      expect(wrapper.html()).toEqual(expectedValue.html());
    });
  });

  describe('when it has analyses', () => {
    let researchPlan = null;

    const btnAdd = (
      <div style={{ marginBottom: '10px' }}>
        &nbsp;<Button
          className="button-right"
          bsSize="xsmall"
          bsStyle="success"
        >
          Add analysis
        </Button>
      </div>
    );

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
        <DndProvider backend={HTML5Backend}>
          <ResearchPlanDetailsContainers researchPlan={researchPlan} readOnly={false} />
        </DndProvider>
      );
      const expectedValue = shallow(
        <div>
          {btnAdd}
          <PanelGroup id="research_plan-analyses-panel" defaultActiveKey={0} activeKey={0} accordion>
            <Panel
              eventKey={0}
              key={`research_plan_container_deleted_${analysis.id}`}
            >
              <Panel.Heading>
                <div style={{ width: '100%' }}>
                  <strike>
                    {analysis.name}
                    {` - Type: ${analysis.extended_metadata.kind}`}

                  </strike>
                  <Button className="pull-right" bsSize="xsmall" bsStyle="danger">
                    <i className="fa fa-undo" />
                  </Button>
                </div>
              </Panel.Heading>
            </Panel>
          </PanelGroup>
        </div>
      );
      expect(wrapper.html()).toEqual(expectedValue.html());
    });
  });
});
