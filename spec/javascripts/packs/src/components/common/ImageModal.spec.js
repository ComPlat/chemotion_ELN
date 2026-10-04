import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach, afterEach } from 'mocha';
import ImageModal from 'src/components/common/ImageModal';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

configure({ adapter: new Adapter() });

const docx = {
  id: 7, filename: 'report.docx', thumb: true, previewable: false,
};
const png = {
  id: 8, filename: 'photo.png', thumb: true, previewable: true,
};

const render = (props) => shallow(<ImageModal popObject={{ title: 't' }} {...props} />);
const previewBox = (wrapper) => wrapper.find('.preview-table').first();

describe('ImageModal', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AttachmentFetcher, 'fetchThumbnail').resolves('dGh1bWI=');
    sandbox.stub(AttachmentFetcher, 'fetchThumbnails').resolves({ thumbnails: [] });
    sandbox.stub(AttachmentFetcher, 'fetchImageAttachment').resolves({ type: 'image/png', data: 'blob:x' });
  });

  afterEach(() => sandbox.restore());

  describe('with a single attachment the server marked as not previewable', () => {
    it('keeps the thumbnail but is not clickable', () => {
      const wrapper = render({ attachment: docx });

      expect(AttachmentFetcher.fetchThumbnail.calledWith({ id: 7 })).toBe(true);
      expect(previewBox(wrapper).prop('role')).toBeUndefined();
      expect(previewBox(wrapper).prop('onClick')).toBeUndefined();
    });

    it('does not open the modal or call GET image/:id', () => {
      const wrapper = render({ attachment: docx });
      wrapper.instance().handleModalShow({ preventDefault() {}, stopPropagation() {} });

      expect(wrapper.state('showModal')).toBe(false);
      expect(AttachmentFetcher.fetchImageAttachment.called).toBe(false);
    });
  });

  it('opens the modal on click for a previewable attachment', () => {
    const wrapper = render({ attachment: png });
    expect(previewBox(wrapper).prop('role')).toBe('button');

    previewBox(wrapper).simulate('click', { preventDefault() {}, stopPropagation() {} });

    expect(wrapper.state('showModal')).toBe(true);
    expect(wrapper.state('selectedId')).toBe(8);
    expect(AttachmentFetcher.fetchImageAttachment.calledWith({ id: 8 })).toBe(true);
  });

  it('stays clickable for an attachment without the flag (unsaved or raw-serialized)', () => {
    const wrapper = render({ attachment: { id: 9, filename: 'x.png', thumb: true } });
    expect(previewBox(wrapper).prop('role')).toBe('button');
  });

  it('respects disableClick', () => {
    const wrapper = render({ attachment: png, disableClick: true });
    expect(previewBox(wrapper).prop('onClick')).toBeUndefined();
  });

  describe('in analysis mode', () => {
    const container = (attachments) => ({
      children: [{ container_type: 'dataset', attachments }],
      extended_metadata: {},
    });
    const pdf = {
      id: 11, filename: 'spectrum.pdf', thumb: false, previewable: true, updated_at: '01.01.2026, 10:00:00 +0000',
    };
    const pptx = {
      id: 12, filename: 'slides.pptx', thumb: true, previewable: false, updated_at: '02.01.2026, 10:00:00 +0000',
    };

    it('falls back to the first candidate when no default can be previewed', () => {
      const wrapper = render({ container: container([pptx, pdf]) });
      wrapper.instance().handleModalShow({ preventDefault() {}, stopPropagation() {} });

      expect(wrapper.state('showModal')).toBe(true);
      expect(wrapper.state('selectedId')).toBe(11);
    });
  });
});
