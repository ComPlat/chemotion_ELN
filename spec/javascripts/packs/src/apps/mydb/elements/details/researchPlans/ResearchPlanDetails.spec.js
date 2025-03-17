/* global describe, context, it, beforeEach, afterEach */

import React from 'react';
import expect from 'expect';
import uuid from 'uuid';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';

import ResearchPlanFactory from '@tests/factories/ResearchPlanFactory';
import AttachmentFactory from '@tests/factories/AttachmentFactory';
// although not used import of ElementStore needed to initialize
// the ResearchPlanDetails.js component. It must be executed before
// the import of ResearchPlanDetails. Beware of the linter which
// may put it at the end of the imports !!!

// eslint-disable-next-line no-unused-vars
import ElementStore from '@src/stores/alt/stores/ElementStore';

import ResearchPlanDetails from '@src/apps/mydb/elements/details/researchPlans/ResearchPlanDetails';
import CommentActions from '@src/stores/alt/actions/CommentActions';

configure({ adapter: new Adapter() });

function emptyFunc() {}

describe('ResearchPlanDetails', () => {
  let stub;

  beforeEach(() => {
    stub = sinon.stub(CommentActions, 'fetchComments');
    stub.returns(Promise.resolve());
  });
  afterEach(() => {
    stub.restore();
  });

  const FIELD_ID_IMAGE = 'entry-001';
  const FIELD_ID_NO_IMAGE = 'entry-002';

  describe('.handleBodyChange', () => {
    context('on non existing field', () => {
      it(' expecting nothing was changed', async () => {
        const researchPlanWithImage = await ResearchPlanFactory.build(
          'ResearchPlanFactory.with_image_body_field'
        );
        const wrapper = shallow(
          React.createElement(
            ResearchPlanDetails,
            { researchPlan: researchPlanWithImage, toggleFullScreen: emptyFunc },
          )
        );
        wrapper.instance().handleBodyChange({}, 'nonExistingFieldId', []);

        expect(researchPlanWithImage.changed).toEqual(false);
      });
    });

    context('on non image field', () => {
      it(' expected to be changed', async () => {
        const researchPlanWithoutImage = await ResearchPlanFactory.build(
          'ResearchPlanFactory.with_not_image_body_field'
        );

        const wrapper = shallow(
          React.createElement(
            ResearchPlanDetails,
            { researchPlan: researchPlanWithoutImage, toggleFullScreen: emptyFunc },
          )
        );

        wrapper.instance().handleBodyChange(
          {
            test: 'fakeValue',
          },
          FIELD_ID_NO_IMAGE,
          []
        );

        expect(researchPlanWithoutImage.changed).toEqual(true);
        expect(researchPlanWithoutImage.attachments.length).toEqual(1);
        expect(researchPlanWithoutImage.body).toEqual([
          {
            id: FIELD_ID_NO_IMAGE,
            type: 'no-image',
            value: {
              test: 'fakeValue',
            },
          },
        ]);
      });
    });
    context('replacing an image field for the first time', () => {
      it('expecting to be replaced', async () => {
        const researchPlanWithImage = await ResearchPlanFactory.build(
          'ResearchPlanFactory.with_image_body_field'
        );
        const newImageAttachment = await AttachmentFactory.build('AttachmentFactory.new', {
          id: uuid.v1(),
        });

        const expectedField = {
          id: FIELD_ID_IMAGE,
          type: 'image',
          value: {
            file_name: 'abc.png',
            public_name: newImageAttachment.identifier,
          },
        };

        const wrapper = shallow(
          React.createElement(
            ResearchPlanDetails,
            { researchPlan: researchPlanWithImage, toggleFullScreen: emptyFunc },
          )
        );

        wrapper
          .instance()
          .handleBodyChange(expectedField.value, FIELD_ID_IMAGE, [
            newImageAttachment,
          ]);

        expect(researchPlanWithImage.changed).toEqual(true);
        expect(researchPlanWithImage.attachments.length).toEqual(2);
        expect(researchPlanWithImage.attachments[1].identifier).toEqual(
          newImageAttachment.identifier
        );
        expect(researchPlanWithImage.body).toEqual([expectedField]);
      });
    });
    context(
      'replacing an image field for the second time - replacing an temporary image',
      () => {
        it('expecting to be replaced with old value in memory', async () => {
          const attachmentToAdd = await AttachmentFactory.build('AttachmentFactory.new', {
            id: uuid.v1(),
          });
          const researchPlanWithImage = await ResearchPlanFactory.build(
            'ResearchPlanFactory.with_image_body_field'
          );

          const newValue = {
            file_name: 'abc.png',
            public_name: attachmentToAdd.identifier,
            old_value: researchPlanWithImage.attachments[0].identifier,
          };

          const expectedField = {
            id: FIELD_ID_IMAGE,
            type: 'image',
            value: newValue,
          };

          const wrapper = shallow(
            React.createElement(
              ResearchPlanDetails,
              { researchPlan: researchPlanWithImage, toggleFullScreen: emptyFunc }
            )
          );

          wrapper
            .instance()
            .handleBodyChange(newValue, FIELD_ID_IMAGE, [attachmentToAdd]);

          expect(researchPlanWithImage.changed).toEqual(true);
          expect(researchPlanWithImage.attachments.length).toEqual(2);
          expect(researchPlanWithImage.body).toEqual([expectedField]);
        });
      }
    );

  });
});
