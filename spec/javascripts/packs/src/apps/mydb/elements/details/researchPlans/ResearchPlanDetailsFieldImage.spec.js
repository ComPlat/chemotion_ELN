/* global describe, it */

import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ResearchPlanDetailsFieldImage from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldImage';
import ResearchPlan from 'src/models/ResearchPlan';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import sinon from 'sinon';

Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetailsFieldImage', () => {
  describe('.render()', () => {
    it('no image choosen in view mode', () => {
      const rp = ResearchPlan.buildEmpty();

      rp.value = {};
      rp.value.public_name = null;

      const wrapper = shallow(React.createElement(ResearchPlanDetailsFieldImage, { field: rp, attachments: [] }));

      expect(wrapper.find('img').length).toEqual(0);
    });

    it('temporary image in blob in view mode', () => {
      const rp = ResearchPlan.buildEmpty();

      rp.value = {};
      rp.value.public_name = 'blob://...';
      rp.value.file_name = 'myFile.png';

      const wrapper = shallow(React.createElement(ResearchPlanDetailsFieldImage, { field: rp, attachments: [] }));

      expect(wrapper.find('img').length).toEqual(1);
      expect(wrapper.find('img').prop('src')).toEqual('blob://...');
    });

    it('deprecated image in view mode', () => {
      const rp = ResearchPlan.buildEmpty();

      rp.value = {};
      rp.value.public_name = 'xxx.png';
      rp.value.file_name = 'xxx.png';

      const wrapper = shallow(React.createElement(ResearchPlanDetailsFieldImage, { field: rp, attachments: [] }));

      expect(wrapper.find('img').length).toEqual(1);
      expect(wrapper.find('img').prop('src')).toEqual(
        '/images/research_plans/xxx.png'
      );
    });

    it('image from attachment on server in view mode', async () => {
      sinon
        .stub(AttachmentFetcher, 'fetchImageAttachment')
        .callsFake(() => new Promise(() => 'srcToImage'));

      const rp = ResearchPlan.buildEmpty();

      rp.value = {};
      rp.value.public_name = 'xxx';
      rp.value.file_name = 'xxx';

      const wrapper = shallow(React.createElement(ResearchPlanDetailsFieldImage, { field: rp, attachments: [] }));

      expect(wrapper.find('img').length).toEqual(1);

      // TO DO: Find a way here to wait until the
      // promise above resolved and updated the state of the component
    });
  });
});
