import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlanDetailsFieldImage from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldImage';
import ResearchPlan from 'src/models/ResearchPlan';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import sinon from 'sinon';
import toMatchSnapshot from 'expect-mocha-snapshot';
import { describe, it } from 'mocha';
import ResearchPlanFactory from 'factories/ResearchPlanFactory';

Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetailsFieldImage', () => {
  expect.extend({ toMatchSnapshot });

  describe('.render()', () => {
    describe('no image choosen in view mode', async () => {
      it('no img tag should be rendered', async function () {
        const researchPlan = await ResearchPlanFactory.build('empty', {}, { reset: true });

        const wrapper = shallow(<ResearchPlanDetailsFieldImage field={researchPlan} />);

        expect(wrapper.html()).toMatchSnapshot(this);
      });
    });
    describe('temporary image in blob in view mode', async () => {
      it('img tag present, src should be starting with blob', async function () {
        const researchPlan = await ResearchPlanFactory.build('empty', {}, { reset: true });

        researchPlan.value = {};
        researchPlan.value.public_name = 'blob://...';
        researchPlan.value.file_name = 'myFile.png';

        const wrapper = shallow(<ResearchPlanDetailsFieldImage field={researchPlan} />);
        expect(wrapper.html()).toMatchSnapshot(this);
      });
    });
    describe('deprecated image in view mode', async () => {
      it('img tag present, src should be starting with absolute path /images/research_plans', async function () {
        const rp = ResearchPlan.buildEmpty();

        rp.value = {};
        rp.value.public_name = 'xxx.png';
        rp.value.file_name = 'xxx.png';

        const wrapper = shallow(<ResearchPlanDetailsFieldImage field={rp} />);
        expect(wrapper.html()).toMatchSnapshot(this);
      });
    });
    describe('image from attachment on server in view mode', async () => {
      it('img tag present, src should be the scrToImage from the stubed method', async function () {
        sinon
          .stub(AttachmentFetcher, 'fetchImageAttachmentByIdentifier')
          .callsFake((src) => { const result = []; result.data = src.identifier; return Promise.resolve(result); });

        const rp = ResearchPlan.buildEmpty();

        rp.value = {};
        rp.value.public_name = 'scrToImageOnServer';
        rp.value.file_name = 'fileName';

        const wrapper = await shallow(<ResearchPlanDetailsFieldImage field={rp} />);

        expect(wrapper.html()).toMatchSnapshot(this);
      });
    });
  });
});
