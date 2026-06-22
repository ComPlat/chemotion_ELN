/* global describe, it, beforeEach, afterEach */

import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';

import { GenericDetailsAttachments } from 'src/apps/mydb/elements/details/genericAttachmentsTab/GenericDetailsAttachments';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from '../../../../../../../../../app/javascript/src/stores/alt/stores/UIStore';

configure({ adapter: new Adapter() });

const mockElement = { checksum: () => 'abc', _checksum: 'abc' };

function makeAttachment(overrides = {}) {
  return {
    id: Math.floor(Math.random() * 100000),
    filename: 'file.txt',
    filesize: 1024,
    thumb: false,
    is_deleted: false,
    created_at: '01.01.2024, 00:00:00 +0000',
    preview: '/images/wild_card/not_available.svg',
    ...overrides,
  };
}

function defaultProps(overrides = {}) {
  return {
    element: mockElement,
    elementType: 'Sample',
    attachments: [],
    onDrop: sinon.spy(),
    onDelete: sinon.spy(),
    onUndoDelete: sinon.spy(),
    onEdit: sinon.spy(),
    readOnly: false,
    ...overrides,
  };
}

describe('GenericDetailsAttachments', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    UIStore.state.thirdPartyApps = [];
    UserStore.state.currentUser = null;
    sandbox.stub(AttachmentFetcher, 'fetchThumbnail').resolves(null);
    sandbox.stub(UserStore, 'isUserQuotaExceeded').returns(false);
  });

  afterEach(() => {
    sandbox.restore();
  });

  // --- checklist: "There are currently no attachments." empty state ---
  describe('empty state', () => {
    it('shows no-attachments message when list is empty', () => {
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps())
      );
      expect(wrapper.text()).toContain('There are currently no attachments.');
    });
  });

  // --- checklist: "Filter by partial filename → only matching files shown; clear → all return" ---
  describe('filter', () => {
    it('filters attachments by partial filename', () => {
      const attachments = [
        makeAttachment({ id: 1, filename: 'apple.pdf' }),
        makeAttachment({ id: 2, filename: 'banana.png' }),
        makeAttachment({ id: 3, filename: 'cherry.jpg' }),
      ];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );

      wrapper.find('input[type="text"]').simulate('change', { target: { value: 'an' } });
      wrapper.update();

      const rows = wrapper.find('.attachment-row');
      expect(rows).toHaveLength(1);
      expect(rows.at(0).text()).toContain('banana.png');
    });

    it('shows all attachments after clearing the filter', () => {
      const attachments = [
        makeAttachment({ id: 1, filename: 'apple.pdf' }),
        makeAttachment({ id: 2, filename: 'banana.png' }),
      ];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );

      const input = wrapper.find('input[type="text"]');
      input.simulate('change', { target: { value: 'apple' } });
      wrapper.update();
      expect(wrapper.find('.attachment-row')).toHaveLength(1);

      input.simulate('change', { target: { value: '' } });
      wrapper.update();
      expect(wrapper.find('.attachment-row')).toHaveLength(2);
    });
  });

  // --- checklist: "Sort by Name / Size / Date asc and desc → order updates correctly" ---
  describe('sort', () => {
    it('sorts by name ascending by default', () => {
      const attachments = [
        makeAttachment({ id: 2, filename: 'banana.png' }),
        makeAttachment({ id: 1, filename: 'apple.pdf' }),
        makeAttachment({ id: 3, filename: 'cherry.jpg' }),
      ];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );

      const rows = wrapper.find('.attachment-row-text');
      expect(rows.at(0).text()).toContain('apple.pdf');
      expect(rows.at(1).text()).toContain('banana.png');
      expect(rows.at(2).text()).toContain('cherry.jpg');
    });

    it('reverses order when sort direction is toggled to descending', () => {
      const attachments = [
        makeAttachment({ id: 1, filename: 'apple.pdf' }),
        makeAttachment({ id: 2, filename: 'cherry.jpg' }),
      ];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );

      // The sort-direction button shows '▲' when asc
      const toggleBtn = wrapper.find('button').filterWhere((b) => b.text() === '▲');
      expect(toggleBtn).toHaveLength(1);
      toggleBtn.simulate('click');
      wrapper.update();

      const rows = wrapper.find('.attachment-row-text');
      expect(rows.at(0).text()).toContain('cherry.jpg');
      expect(rows.at(1).text()).toContain('apple.pdf');
    });

    it('sorts by file size ascending when size is selected', () => {
      const attachments = [
        makeAttachment({ id: 1, filename: 'big.pdf', filesize: 9000 }),
        makeAttachment({ id: 2, filename: 'small.txt', filesize: 100 }),
        makeAttachment({ id: 3, filename: 'medium.png', filesize: 500 }),
      ];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );

      wrapper.find('select.sorting-row-style').simulate('change', { target: { value: 'size' } });
      wrapper.update();

      const rows = wrapper.find('.attachment-row-text');
      expect(rows.at(0).text()).toContain('small.txt');
      expect(rows.at(1).text()).toContain('medium.png');
      expect(rows.at(2).text()).toContain('big.pdf');
    });
  });

  // --- checklist: "Click delete → filename shows struck-through, undo button appears" ---
  describe('delete state', () => {
    it('shows filename with strike-through when attachment is marked for deletion', () => {
      const attachments = [
        makeAttachment({ id: 1, filename: 'to-delete.pdf', is_deleted: true }),
      ];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );

      expect(wrapper.find('strike')).toHaveLength(1);
      expect(wrapper.find('strike').text()).toBe('to-delete.pdf');
    });

    it('shows undo button when attachment is marked for deletion', () => {
      const attachments = [
        makeAttachment({ id: 1, filename: 'to-delete.pdf', is_deleted: true }),
      ];
      const onUndoDelete = sinon.spy();
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments, onUndoDelete }))
      );

      const undoBtn = wrapper.find('i.fa-undo').closest('button');
      expect(undoBtn).toHaveLength(1);
    });

    it('calls onUndoDelete with the attachment when the undo button is clicked', () => {
      const attachment = makeAttachment({ id: 1, filename: 'to-delete.pdf', is_deleted: true });
      const onUndoDelete = sinon.spy();
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments: [attachment], onUndoDelete }))
      );

      wrapper.find('i.fa-undo').closest('button').simulate('click');
      expect(onUndoDelete.calledOnce).toBe(true);
      expect(onUndoDelete.firstCall.args[0]).toEqual(attachment);
    });

    it('does not show strike-through for a non-deleted attachment', () => {
      const attachments = [makeAttachment({ id: 1, filename: 'keep.pdf', is_deleted: false })];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );
      expect(wrapper.find('strike')).toHaveLength(0);
    });
  });

  // --- checklist: "Open a Reaction owned by another user → delete button absent/disabled" ---
  describe('read-only mode', () => {
    it('disables the delete button when readOnly is true', () => {
      const attachments = [makeAttachment({ id: 1, filename: 'locked.pdf' })];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments, readOnly: true }))
      );

      const deleteBtn = wrapper.find('i.fa-trash-o').closest('button');
      expect(deleteBtn).toHaveLength(1);
      expect(deleteBtn.prop('disabled')).toBe(true);
    });

    it('enables the delete button when readOnly is false', () => {
      const attachments = [makeAttachment({ id: 1, filename: 'editable.pdf' })];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments, readOnly: false }))
      );

      const deleteBtn = wrapper.find('i.fa-trash-o').closest('button');
      expect(deleteBtn).toHaveLength(1);
      expect(deleteBtn.prop('disabled')).toBe(false);
    });
  });

  // --- checklist: "Add a file that would exceed user quota → warning alert shown" ---
  describe('quota warning', () => {
    it('shows a quota warning alert when user quota is exceeded', () => {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(AttachmentFetcher, 'fetchThumbnail').resolves(null);
      sandbox.stub(UserStore, 'isUserQuotaExceeded').returns(true);

      const attachments = [makeAttachment({ id: 1, filename: 'big.pdf' })];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );

      expect(wrapper.find('.alert-warning').exists()).toBe(true);
      expect(wrapper.find('.alert-warning').text()).toContain('quota');
    });

    it('does not show the quota warning when quota is not exceeded', () => {
      const attachments = [makeAttachment({ id: 1, filename: 'small.pdf' })];
      const wrapper = mount(
        React.createElement(GenericDetailsAttachments, defaultProps({ attachments }))
      );

      expect(wrapper.find('.alert-warning').exists()).toBe(false);
    });
  });
});
