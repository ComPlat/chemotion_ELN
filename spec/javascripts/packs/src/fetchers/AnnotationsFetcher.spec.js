/* global describe, it */

import expect from 'expect';
import ContainerFactory from 'factories/ContainerFactory';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';

describe('AnnotationsFetcher', () => {
  describe('.extractAttachmentsFromContainer()', () => {
    it('with linear hierarchy and two attachments', async () => {
      const container = await ContainerFactory.build('ContainerFactory.four_container_linear_hierarchy_two_attachments');

      const attachments = AnnotationsFetcher.extractAttachmentsFromContainer(container);
      expect(attachments.length).toEqual(2);
    });
  });
});
