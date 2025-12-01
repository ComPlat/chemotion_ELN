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

/**
 * Extracts the most relevant attachment (combined or latest) from a container's dataset children.
 *
 * This function searches through all child containers of type 'dataset', collects their attachments,
 * filters those that have a thumbnail (`thumb`), and then returns the following in priority:
 * - The attachment whose filename includes the word "combined" (case-insensitive).
 * - Otherwise, the most recently updated attachment.
 * - If none are found, returns `null`.
 *
 * @param {Object} container - The container object containing potential children.
 * @param {Array<Object>} container.children - An array of child container objects.
 * @returns {Object|null} The selected attachment object with a thumbnail, or `null` if none are found.
 */
const getAttachmentFromContainer = (container) => {
  const datasetChildren = container.children?.filter((child) => child.container_type === 'dataset') || [];

  const allRawAttachments = datasetChildren.flatMap((child) => child.attachments || []);
  const attachments = allRawAttachments
    .filter((att) => att.thumb);
  const latestImageAttachment = attachments
    .sort((a, b) => parseDateWithMoment(b.updated_at).valueOf() - parseDateWithMoment(a.updated_at).valueOf())[0];
  if (latestImageAttachment) return latestImageAttachment;

  const preview = container.preview_img;
  if (preview?.id) {
    return {
      id: preview.id,
      filename: preview.filename,
      thumb: true,
    };
  }

  return null;
};

/**
 * Fetches the base64 thumbnail image source for a given attachment ID.
 *
 * If no ID is provided, or if the fetch fails, a fallback SVG image path is returned.
 *
 * Aim: To retrieve a displayable image source for a given attachment ID by fetching its thumbnail,
 * while gracefully handling missing or invalid IDs and fetch errors using fallback images.
 *
 * @async
 * @function fetchImageSrcByAttachmentId
 * @param {string|number} id - The ID of the attachment.
 * @returns {Promise<string>} A promise that resolves to a base64 image source string or a fallback SVG path.
 */
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
