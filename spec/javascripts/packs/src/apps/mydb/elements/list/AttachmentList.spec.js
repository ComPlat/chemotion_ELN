import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it } from 'mocha';
import { attachmentThumbnail } from 'src/apps/mydb/elements/list/AttachmentList';
import ImageModal from 'src/components/common/ImageModal';

configure({ adapter: new Adapter() });

const render = (attachment) => shallow(attachmentThumbnail(attachment));

describe('attachmentThumbnail', () => {
  it('renders ImageModal for a saved image', () => {
    const wrapper = render({
      id: 1, filename: 'photo.png', thumb: true, previewable: true,
    });
    expect(wrapper.find(ImageModal).length).toBe(1);
  });

  it('keeps ImageModal (thumbnail and hover) for a thumbnailed file that cannot be previewed', () => {
    const attachment = {
      id: 2, filename: 'report.docx', thumb: true, previewable: false,
    };
    const wrapper = render(attachment);
    expect(wrapper.find(ImageModal).prop('attachment')).toBe(attachment);
  });

  it('shows a file-type icon for a saved file with neither thumbnail nor preview', () => {
    const wrapper = render({
      id: 3, filename: 'spectrum.zip', thumb: false, previewable: false,
    });
    expect(wrapper.find(ImageModal).length).toBe(0);
    expect(wrapper.find('i.fa-file-archive-o').length).toBe(1);
  });

  it('renders ImageModal for an unsaved upload (no previewable flag yet)', () => {
    const wrapper = render({
      id: 'uuid-1', filename: 'photo.png', is_new: true, file: { type: 'image/png' },
    });
    expect(wrapper.find(ImageModal).length).toBe(1);
  });
});
