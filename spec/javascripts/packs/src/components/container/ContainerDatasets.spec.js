import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it } from 'mocha';
import ContainerDatasets from 'src/components/container/ContainerDatasets';

configure({ adapter: new Adapter() });

describe('ContainerDatasets#clearStalePreferredThumbnail', () => {
  const docx = {
    id: 1, filename: 'data.docx', thumb: true, previewable: false,
  };
  const png = {
    id: 2, filename: 'spectrum.png', thumb: true, previewable: true,
  };
  const pdf = {
    id: 3, filename: 'spectrum.pdf', thumb: false, previewable: true,
  };
  const analysis = (attachments, preferred) => ({
    children: [{ container_type: 'dataset', attachments }],
    extended_metadata: { preferred_thumbnail: preferred },
  });
  const reassign = (container) => {
    const onChange = sinon.spy();
    const wrapper = shallow(
      <ContainerDatasets container={container} rootContainer={{}} onChange={onChange} />
    );
    wrapper.instance().clearStalePreferredThumbnail(container);
    return { preferred: container.extended_metadata.preferred_thumbnail, onChange };
  };

  it('keeps a valid preference', () => {
    expect(reassign(analysis([docx, png], '2')).preferred).toBe('2');
  });

  it('accepts a previewable file without a thumbnail, like the carousel does', () => {
    expect(reassign(analysis([docx, pdf], '3')).preferred).toBe('3');
  });

  it('never auto-assigns when no preference is set, so the header follows the latest file', () => {
    [[docx, png], [pdf, png], [docx, pdf], [pdf]].forEach((attachments) => {
      const { preferred, onChange } = reassign(analysis(attachments, null));
      expect(preferred).toBe(null);
      expect(onChange.calledOnce).toBe(true);
    });
  });

  it('clears a preference the preview modal cannot show instead of picking a substitute', () => {
    expect(reassign(analysis([docx, png], '1')).preferred).toBe(null);
  });

  it('clears a preference pointing at a deleted or missing attachment', () => {
    expect(reassign(analysis([{ ...png, is_deleted: true }, pdf], '2')).preferred).toBe(null);
    expect(reassign(analysis([png], '99')).preferred).toBe(null);
  });

  it('clears a preference whose dataset was removed, keeps one in a remaining dataset', () => {
    const twoDatasets = (preferred) => ({
      children: [
        { container_type: 'dataset', is_deleted: true, attachments: [png] },
        { container_type: 'dataset', attachments: [pdf] },
      ],
      extended_metadata: { preferred_thumbnail: preferred },
    });
    expect(reassign(twoDatasets('2')).preferred).toBe(null);
    expect(reassign(twoDatasets('3')).preferred).toBe('3');
  });

  it('clears the preference when nothing can be previewed', () => {
    const { preferred, onChange } = reassign(analysis([docx], '1'));
    expect(preferred).toBe(null);
    expect(onChange.calledOnce).toBe(true);
  });
});
