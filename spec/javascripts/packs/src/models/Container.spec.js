import Container from '@src/models/Container';
import ContainerFactory from '@tests/factories/ContainerFactory';
import expect from 'expect';

import {
  describe, it
} from 'mocha';

describe('Container.switchPositionOfChildContainer()', async () => {
  describe('when putting first container after second one', async () => {
    it('new order should be c2,c1,c3,c4', async () => {
      const container = await ContainerFactory.build('ContainerFactory.container_with_four_children');
      const originalIds = container.children.map((e) => e.id);

      Container.switchPositionOfChildContainer(container.children, originalIds[0], originalIds[1]);

      expect(container.children[0].id).toBe(originalIds[1]);
      expect(container.children[1].id).toBe(originalIds[0]);
      expect(container.children[2].id).toBe(originalIds[2]);
      expect(container.children[3].id).toBe(originalIds[3]);
    });
  });
});
