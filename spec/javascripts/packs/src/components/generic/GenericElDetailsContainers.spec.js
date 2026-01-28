import expect from 'expect';
import {
  describe, it, beforeEach
} from 'mocha';

import Container from 'src/models/Container';
import ArrayUtils from 'src/utilities/ArrayUtils';

describe('GenericElDetailsContainers', () => {
  describe('toggleAddToReport', () => {
    it('should toggle report flag', () => {
      const container = Container.buildEmpty();
      container.extended_metadata.report = false;

      // Toggle to true
      container.extended_metadata.report = !container.extended_metadata.report;
      expect(container.extended_metadata.report).toBe(true);

      // Toggle back to false
      container.extended_metadata.report = !container.extended_metadata.report;
      expect(container.extended_metadata.report).toBe(false);
    });
  });

  describe('sortArrByIndex', () => {
    let containers;

    beforeEach(() => {
      const container1 = Container.buildEmpty();
      container1.name = 'Container A';
      container1.extended_metadata.index = 2;

      const container2 = Container.buildEmpty();
      container2.name = 'Container B';
      container2.extended_metadata.index = 0;

      const container3 = Container.buildEmpty();
      container3.name = 'Container C';
      container3.extended_metadata.index = 1;

      containers = [container1, container2, container3];
    });

    it('should sort containers by index', () => {
      const sorted = ArrayUtils.sortArrByIndex(containers);

      expect(sorted[0].name).toBe('Container B'); // index 0
      expect(sorted[1].name).toBe('Container C'); // index 1
      expect(sorted[2].name).toBe('Container A'); // index 2
    });

    it('should handle string indices from backend', () => {
      containers[0].extended_metadata.index = '2';
      containers[1].extended_metadata.index = '0';
      containers[2].extended_metadata.index = '1';

      const sorted = ArrayUtils.sortArrByIndex(containers);

      expect(sorted[0].name).toBe('Container B');
      expect(sorted[1].name).toBe('Container C');
      expect(sorted[2].name).toBe('Container A');
    });
  });

  describe('comment functionality', () => {
    it('should update container description', () => {
      const container = Container.buildEmpty();
      container.description = 'Test comment';
      expect(container.description).toBe('Test comment');
    });

    it('should detect if comment exists', () => {
      const container = Container.buildEmpty();

      // Empty
      container.description = '';
      let hasComment = !!(container.description && container.description.trim() !== '');
      expect(hasComment).toBe(false);

      // Whitespace only
      container.description = '   ';
      hasComment = !!(container.description && container.description.trim() !== '');
      expect(hasComment).toBe(false);

      // Has content
      container.description = 'Some comment';
      hasComment = !!(container.description && container.description.trim() !== '');
      expect(hasComment).toBe(true);
    });
  });
});
