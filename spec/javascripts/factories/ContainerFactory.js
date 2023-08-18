import { factory } from 'factory-bot';
import Container from 'src/models/Container';
import AttachmentFactory from 'factories/AttachmentFactory';

export default class ContainerFactory {
  static instance = undefined;

  static build(...args) {
    if (ContainerFactory.instance === undefined) {
      ContainerFactory.instance = new ContainerFactory();
    }

    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;

    this.factory.define('four_container_linear_hierarchy_two_attachments', Container, async () => {
      const container_000 = Container.buildEmpty();
      const container_001 = Container.buildEmpty();
      const container_002 = Container.buildEmpty();
      const container_003 = Container.buildEmpty();
      const attachment_000 = await AttachmentFactory.build('new');
      const attachment_001 = await AttachmentFactory.build('new');

      container_000.children.push(container_001);
      container_001.children.push(container_002);
      container_002.children.push(container_003);
      container_001.attachments.push(attachment_000);
      container_003.attachments.push(attachment_001);

      return container_000;
    });
  }
}
