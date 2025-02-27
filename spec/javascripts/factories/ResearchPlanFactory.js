import { factory } from '@eflexsystems/factory-bot';
import ResearchPlan from "src/models/ResearchPlan";
import Container from "src/models/Container";
import AttachmentFactory from "factories/AttachmentFactory";

export default class ResearchPlanFactory {
  static instance = undefined;

  static async build(...args) {
    if (ResearchPlanFactory.instance === undefined) {
      ResearchPlanFactory.instance = new ResearchPlanFactory();
    }

    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;
   
    this.factory.define("ResearchPlanFactory.empty", ResearchPlan, {
      collection_id: 0,
      type: "research_plan",
      name: "New Research Plan",
      body: [],
      mode: "edit",
      container: Container.init(),
      changed: true,
      can_update: true,
      attachments: [],
      title: "test_research_plan",
      wellplates: [],
      segments: [],
    });


    this.factory.extend("ResearchPlanFactory.empty", "ResearchPlanFactory.with_not_image_body_field",{
      body: [{
        id: "entry-002",
        type: "no-image",
        value: {}
      }],
      changed: false,
      attachments : [ AttachmentFactory.build("AttachmentFactory.new")]

    });
    this.factory.extend("ResearchPlanFactory.empty", "ResearchPlanFactory.with attachment_not_in_body",{
      body: [],
      changed: false,
      attachments : [ AttachmentFactory.build("AttachmentFactory.new")]

    });
   
    this.factory.define("ResearchPlanFactory.with_image_body_field", ResearchPlan, async () => {
      const attachment = await AttachmentFactory.build("AttachmentFactory.new");
      const researchPlan = await ResearchPlanFactory.build("ResearchPlanFactory.empty");
      researchPlan.attachments.push(attachment);
      researchPlan.changed = false;
      researchPlan.body = [{
        id: 'entry-001',
        type: 'image',
        value: {
          file_name: 'xyz.png',
          public_name: attachment.identifier,
        }
      }];
      return researchPlan;
    });
  }
}
