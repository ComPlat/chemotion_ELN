import { factory } from 'factory-bot';
import ResearchPlan from 'src/models/ResearchPlan';
import AttachmentFactory from 'factories/AttachmentFactory';
import PseudoRandomUUIDGenerator from 'factories/PseudoRandomUUIDGenerator';
import sha256 from 'sha256';

export default class ResearchPlanFactory {
  static instance = undefined;

  static build(...args) {
    if (ResearchPlanFactory.instance === undefined) {
      ResearchPlanFactory.instance = new ResearchPlanFactory();
    }

    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;

    this.factory.define(
      'empty',
      ResearchPlan,
      () => {
        const researchPlan = ResearchPlan.buildEmpty();
        return researchPlan;
      },
      {
        afterBuild: (model, attrs, buildOptions) => {
          this.setPseudoIdsAndChecksums(model, buildOptions);
          return model;
        }
      }
    );

    this.factory.extend('empty', 'with_not_image_body_field', {
      body: [{
        id: 'entry-002',
        type: 'no-image',
        value: {}
      }],
      changed: false,
      attachments: [AttachmentFactory.build('new')]

    });

    this.factory.define(
      'with_image_body_field',
      ResearchPlan,
      async () => {
        const attachment = await AttachmentFactory.build('new');
        const researchPlan = await ResearchPlanFactory.build('empty');
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
      },
      {
        afterBuild: (model, attrs, buildOptions) => {
          this.setPseudoIdsAndChecksums(model, buildOptions);
          return model;
        }
      }
    );
  }

  setPseudoIdsAndChecksums(model, buildOptions) {
    if (buildOptions.reset) {
      PseudoRandomUUIDGenerator.reset();
    }
    model.id = PseudoRandomUUIDGenerator.createNextUUID();
    model.updateChecksum(sha256(PseudoRandomUUIDGenerator.createNextUUID()));
    model.container.updateChecksum(sha256(PseudoRandomUUIDGenerator.createNextUUID()));
    model.container.id = PseudoRandomUUIDGenerator.createNextUUID();
    model.container.children[0].id = PseudoRandomUUIDGenerator.createNextUUID();
    model.container.children[0].updateChecksum(sha256(PseudoRandomUUIDGenerator.createNextUUID()));
  }
}
