/* global describe, it */

import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import sinon from 'sinon';
import ResearchPlanFactory from 'factories/ResearchPlanFactory';
// eslint-disable-next-line no-unused-vars
import ElementStore from 'src/stores/alt/stores/ElementStore';

import EditorFetcher from 'src/fetchers/EditorFetcher';
import ResearchPlanDetailsAttachments from
  'src/apps/mydb/elements/details/researchPlans/attachmentsTab/ResearchPlanDetailsAttachments';

import { StoreContext } from 'src/stores/mobx/RootStore';
Enzyme.configure({ adapter: new Adapter() });

describe('ResearchPlanDetailsAttachments', async () => {
  
  describe('.createAttachmentPreviews()', async () => {
    describe('.when preview was changed', async () => {
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

        const wrapper = shallow(<ResearchPlanDetailsAttachments
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
        await new Promise(process.nextTick);
        const expectedPreviewComponent = '<img src="data:image/png;base64,reloadedPreviewData"';

        expect(wrapper.html().includes(expectedPreviewComponent)).toBe(true);
      });
    });
  });
});
