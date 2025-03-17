/* global describe, it */

import expect from 'expect';
import ContainerFactory from '@tests/factories/ContainerFactory';
import BaseFetcher from '@src/fetchers/BaseFetcher';

describe('BaseFetcher', () => {
  describe('.getAttachments()', () => {
    it('with linear hierarchy and two attachments', async () => {
      const container = await ContainerFactory.build('ContainerFactory.four_container_linear_hierarchy_two_attachments');

      const attachments = BaseFetcher.getAttachments(container);
      expect(attachments.length).toEqual(2);
    });
  });
});
