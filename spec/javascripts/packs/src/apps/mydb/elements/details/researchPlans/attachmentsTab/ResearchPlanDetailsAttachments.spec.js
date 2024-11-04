/* global describe, it */

import React from 'react';
import expect from 'expect';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import sinon from 'sinon';
import ResearchPlanFactory from 'factories/ResearchPlanFactory';
// eslint-disable-next-line no-unused-vars

import EditorFetcher from 'src/fetchers/EditorFetcher';
import ResearchPlanDetailsAttachments from
  'src/apps/mydb/elements/details/researchPlans/attachmentsTab/ResearchPlanDetailsAttachments';

Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetailsAttachments', () => {
  describe('.createAttachmentPreviews()', () => {
    describe('.when preview was changed', () => {
      it('new preview is rendered', async () => {
        const researchPlanWithAttachment = await ResearchPlanFactory.build(
          'ResearchPlanFactory.with attachment_not_in_body'
        );

        sinon
          .stub(EditorFetcher, 'initial')
          .callsFake(() => new Promise(() => {}));
        sinon
          .stub(AttachmentFetcher, 'fetchThumbnail')
          .callsFake(() => Promise.resolve('reloadedPreviewData'));

        const wrapper = mount(<ResearchPlanDetailsAttachments
          researchPlan={researchPlanWithAttachment}
          attachments={researchPlanWithAttachment.attachments}
          onDrop={(() => {})}
          onDelete={(() => {})}
          onUndoDelete={(() => {})}
          onDownload={(() => {})}
          onAttachmentImportComplete={(() => {})}
          onEdit={(() => {})}
          readOnly={false}
        />);
        const instance = wrapper.instance();
        instance.componentDidMount();

        await new Promise(process.nextTick);

        wrapper.update();
        expect(wrapper.find('img').at(0).prop('src')).toEqual('data:image/png;base64,reloadedPreviewData')
      });
    });
  });
});
