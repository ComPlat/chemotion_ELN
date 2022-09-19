import Attachment from 'src/models/Attachment';
import ResearchPlan from 'src/models/ResearchPlan';
import expect from 'expect';

describe('ResearchPlan', () => {
  describe('.addAttachments', () => {
    const attachmentNotInResearchPlan = new Attachment();
    const attachmentInResearchPlan = new Attachment();
    const researchPlan = ResearchPlan.buildEmpty();

    it('with empty list', () => {
       researchPlan.attachments = [attachmentInResearchPlan];
       researchPlan.addAttachments([]);
       expect(researchPlan.attachments[0].id).toEqual(attachmentInResearchPlan.id);
    });

    it('with two attachments, one already present in researchplan', () => {
      researchPlan.attachments = [attachmentInResearchPlan];

      researchPlan.addAttachments([attachmentNotInResearchPlan, attachmentInResearchPlan]);

      expect(researchPlan.attachments.length).toEqual(2);
      expect(researchPlan.attachments[0].id).toEqual(attachmentInResearchPlan.id);
      expect(researchPlan.attachments[1].id).toEqual(attachmentNotInResearchPlan.id);
    });
  });
});
