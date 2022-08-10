const previewContainerImage = (container, noAttSvg = '/images/wild_card/no_attachment.svg', noAvaSvg = '/images/wild_card/not_available.svg') => {
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

const previewAttachmentImage = (attachment, noAvaSvg = '/images/wild_card/not_available.svg') => {
  if (attachment.thumb) {
    return `/images/thumbnail/${attachment.identifier}`;
  }
  return noAvaSvg;
};

export { previewContainerImage, previewAttachmentImage };
