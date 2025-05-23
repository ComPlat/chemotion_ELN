import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import moment from 'moment';

const parseDateWithMoment = (dateStr) => moment(dateStr, 'DD.MM.YYYY, HH:mm:ss Z');

const previewContainerImage = (
  container,
  noAttSvg = '/images/wild_card/no_attachment.svg',
  noAvaSvg = '/images/wild_card/not_available.svg'
) => {
  const rawImg = (container.preview_img || {}).preview;
  switch (rawImg) {
    case null:
    case undefined:
      return noAttSvg;
    case 'not available':
      return noAvaSvg;
    default:
      return `data:image/png;base64,${rawImg}`;
  }
};
const getAttachmentFromContainer = (container) => {
  const datasetChildren = container.children?.filter((child) => child.container_type === 'dataset') || [];
  const attachments = datasetChildren
    .flatMap((child) => child.attachments || [])
    .filter((att) => att.thumb);
  const combinedImageAttachment = attachments.find((att) => att.filename?.toLowerCase().includes('combined'));
  const latestImageAttachment = attachments
    .sort((a, b) => parseDateWithMoment(b.updated_at).valueOf() - parseDateWithMoment(a.updated_at).valueOf())[0];
  return combinedImageAttachment || latestImageAttachment || null;
};

const fetchImageSrcByAttachmentId = async (id) => {
  try {
    if (!id) {
      return '/images/wild_card/no_attachment.svg';
    }
    const response = await AttachmentFetcher.fetchThumbnail({ id });
    return `data:image/png;base64,${response}`;
  } catch {
    return '/images/wild_card/not_available.svg';
  }
};

const previewAttachmentImage = (
  attachment,
  noAvaSvg = '/images/wild_card/not_available.svg'
) => {
  if (attachment.thumb) {
    return `/images/thumbnail/${attachment.identifier}`;
  }
  return noAvaSvg;
};

export {
  previewContainerImage, previewAttachmentImage, fetchImageSrcByAttachmentId, getAttachmentFromContainer
};
