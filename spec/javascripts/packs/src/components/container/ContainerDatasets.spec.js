import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it } from 'mocha';
import ContainerDatasets from 'src/components/container/ContainerDatasets';

configure({ adapter: new Adapter() });

describe('ContainerDatasets#reassignPreferredThumbnailIfNeeded', () => {
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
    wrapper.instance().reassignPreferredThumbnailIfNeeded(container);
    return { preferred: container.extended_metadata.preferred_thumbnail, onChange };
  };

  it('does not keep or pick a thumbnailed file the preview modal cannot show', () => {
    expect(reassign(analysis([docx, png], '1')).preferred).toBe('2');
    expect(reassign(analysis([docx, png], null)).preferred).toBe('2');
  });

  it('accepts a previewable file without a thumbnail, like the carousel does', () => {
    expect(reassign(analysis([docx, pdf], '3')).preferred).toBe('3');
  });

  it('auto-assigns a file with a thumbnail before a PDF without one', () => {
    expect(reassign(analysis([pdf, png], null)).preferred).toBe('2');
    expect(reassign(analysis([pdf], null)).preferred).toBe('3');
  });

  it('clears the preference when nothing can be previewed', () => {
    const { preferred, onChange } = reassign(analysis([docx], '1'));
    expect(preferred).toBe(null);
    expect(onChange.calledOnce).toBe(true);
  });
});
