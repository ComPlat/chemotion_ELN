import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import ResearchPlan from 'src/models/ResearchPlan';
import Attachment from 'src/models/Attachment';
// although not used import of ElementStore needed to initialize
// the ResearchPlanDetails.js component. It must be executed before
// the import of ResearchPlanDetails. Beware of the linter which
// may put it at the end of the imports !!!

// eslint-disable-next-line no-unused-vars
import ElementStore from 'src/stores/alt/stores/ElementStore';

import ResearchPlanDetails from 'src/apps/mydb/elements/details/researchPlans/ResearchPlanDetails';

Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetails', () => {
  const researchPlan = ResearchPlan.buildEmpty();
  describe('.handleBodyChange', () => {
    const attachmentInBody = new Attachment();
    const attachmentNotInBody = new Attachment();
    const fieldWithImage = {
      id: 'entry-001',
      type: 'image',
      value: {
        file_name: 'xyz.png',
        public_name: attachmentInBody.identifier,
      }
    };

    const fieldWithoutImage = {
      id: 'entry-002',
      type: 'no-image',
      value: {}
    };

    const anotherfieldWithoutImage = {
      id: 'entry-003',
      type: 'no-image',
      value: { test: 'fakeValue' }
    };

    it('on non existing field', () => {
      researchPlan.body = [fieldWithImage];
      researchPlan.changed = false;
      const wrapper = shallow(<ResearchPlanDetails
        researchPlan={researchPlan}
        toggleFullScreen={() => {}}
      />);
      wrapper.instance().handleBodyChange({}, 'nonExistingFieldId', []);

      expect(researchPlan.changed).toEqual(false);
    });

    it('on field without attachments', () => {
      const expectedField = {
        id: 'entry-002',
        type: 'no-image',
        value: { test: 'fakeValue' }
      };

      researchPlan.body = [fieldWithoutImage];
      researchPlan.changed = false;
      researchPlan.attachments = [new Attachment()];
      const wrapper = shallow(<ResearchPlanDetails
        researchPlan={researchPlan}
        toggleFullScreen={() => {}}
      />);

      wrapper.instance().handleBodyChange(anotherfieldWithoutImage.value, fieldWithoutImage.id, []);

      expect(researchPlan.changed).toEqual(true);
      expect(researchPlan.attachments.length).toEqual(1);
      expect(researchPlan.body).toEqual([expectedField]);
    });

    it('replacing a field with attachments, not replacing an old one', () => {
      const expectedField = {
        id: 'entry-002',
        type: 'no-image',
        value: {
          file_name: 'xyz.png',
          public_name: attachmentInBody.identifier,
        }
      };

      researchPlan.body = [fieldWithoutImage];
      researchPlan.changed = false;
      researchPlan.attachments = [new Attachment()];
      const wrapper = shallow(<ResearchPlanDetails
        researchPlan={researchPlan}
        toggleFullScreen={() => {}}
      />);

      wrapper.instance().handleBodyChange(
        fieldWithImage.value,
        fieldWithoutImage.id,
        [attachmentInBody]
      );

      expect(researchPlan.changed).toEqual(true);
      expect(researchPlan.attachments.length).toEqual(2);
      expect(researchPlan.body).toEqual([expectedField]);
    });

    it('replacing a field with attachments, replacing an old one  - with old value check', () => {
      const attachmentToAdd = new Attachment();
      const newValue = {
        file_name: 'abc.png',
        public_name: attachmentToAdd.identifier,
        old_value: attachmentInBody.identifier
      };
      const expectedField = {
        id: 'entry-001',
        type: 'image',
        value: newValue
      };
      researchPlan.body = [fieldWithImage];
      researchPlan.changed = false;
      researchPlan.attachments = [attachmentInBody, attachmentNotInBody];
      const wrapper = shallow(<ResearchPlanDetails
        researchPlan={researchPlan}
        toggleFullScreen={() => {}}
      />);

      wrapper.instance().handleBodyChange(
        newValue,
        fieldWithImage.id,
        [attachmentToAdd]
      );

      expect(researchPlan.changed).toEqual(true);
      expect(researchPlan.attachments.length).toEqual(3);
      expect(researchPlan.body).toEqual([expectedField]);
    });

    it('replacing a field with attachments, replacing an old one  - with file preview check', () => {
      attachmentInBody.file = [];
      attachmentInBody.file.preview = attachmentInBody.identifier;
      attachmentInBody.identifier = 'none';
      const attachmentToAdd = new Attachment();
      const newValue = {
        file_name: 'abc.png',
        public_name: attachmentToAdd.identifier,
        old_value: attachmentInBody.file.preview
      };
      const expectedField = {
        id: 'entry-001',
        type: 'image',
        value: newValue
      };
      researchPlan.body = [fieldWithImage];
      researchPlan.changed = false;
      researchPlan.attachments = [attachmentInBody, attachmentNotInBody];
      const wrapper = shallow(<ResearchPlanDetails
        researchPlan={researchPlan}
        toggleFullScreen={() => {}}
      />);

      wrapper.instance().handleBodyChange(
        newValue,
        fieldWithImage.id,
        [attachmentToAdd]
      );

      expect(researchPlan.changed).toEqual(true);
      expect(researchPlan.attachments.length).toEqual(3);
      expect(researchPlan.body).toEqual([expectedField]);
    });
  });
});
