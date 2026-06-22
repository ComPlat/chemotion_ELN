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
  const attachments = datasetChildren
    .flatMap((child) => child.attachments || [])
    .filter((att) => att.thumb);
  const combinedImageAttachment = attachments
    .filter((att) => att.filename?.toLowerCase().includes('combined'))
    .sort((a, b) => parseDateWithMoment(b.updated_at).valueOf() - parseDateWithMoment(a.updated_at).valueOf())[0];
  const latestImageAttachment = attachments
    .sort((a, b) => parseDateWithMoment(b.updated_at).valueOf() - parseDateWithMoment(a.updated_at).valueOf())[0];
  return combinedImageAttachment || latestImageAttachment || null;
};

/**
 * Derives everything ImageModal needs for analysis "browse & set preferred" mode from a
 * single container, so the generic ImageModal stays domain-thin and the attachment pipeline
 * isn't copy-pasted across every analysis-header parent.
 *
 * Saved attachments only (thumb, not new, not deleted) — the preferred id is shared across
 * all viewers, so it must reference a persisted attachment.
 *
 * Candidates are previewable saved attachments — images and PDFs (plus anything that already
 * has a thumbnail) — so PDFs are selectable even when their thumbnail wasn't generated.
 *
 * @param {Object} container - The analysis container with children[].attachments[].
 * @returns {{previewAttachment: (Object|null), candidates: Array<{id: number, filename: string}>,
 *   candidateIds: number[], preferredId: (number|null)}}
 *   previewAttachment - the default preview attachment (see getAttachmentFromContainer);
 *   candidates - selectable attachments ({ id, filename }) for the carousel;
 *   candidateIds - the candidate ids only;
 *   preferredId - the persisted preferred id, only if still among candidateIds, else null.
 */
const isPreviewableAttachment = (att) => att.thumb === true
  || (att.content_type || '').startsWith('image/')
  || att.content_type === 'application/pdf'
  || /\.pdf$/i.test(att.filename || '');

const getContainerImageData = (container) => {
  const previewAttachment = getAttachmentFromContainer(container);

  const datasetChildren = container?.children?.filter((child) => child.container_type === 'dataset') || [];
  const candidates = datasetChildren
    .flatMap((child) => child.attachments || [])
    .filter((att) => !att.is_deleted && !att.is_new && isPreviewableAttachment(att))
    .map((att) => ({ id: Number(att.id), filename: att.filename }))
    .filter((c) => !Number.isNaN(c.id) && c.id > 0);
  const candidateIds = candidates.map((c) => c.id);

  const raw = container?.extended_metadata?.preferred_thumbnail;
  const preferredId = raw && candidateIds.includes(Number(raw)) ? Number(raw) : null;

  return {
    previewAttachment, candidates, candidateIds, preferredId,
  };
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
    // Validate that id is a valid positive number
    const numericId = Number(id);
    if (!id || Number.isNaN(numericId) || numericId <= 0) {
      return '/images/wild_card/no_attachment.svg';
    }
    const response = await AttachmentFetcher.fetchThumbnail({ id: numericId });
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
  previewContainerImage,
  previewAttachmentImage,
  fetchImageSrcByAttachmentId,
  getAttachmentFromContainer,
  getContainerImageData,
};
