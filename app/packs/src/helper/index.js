export const filePreview = (file) => {
  return file.type.split('/')[0] === 'image' ? file.preview : '/images/wild_card/not_available.svg';
};
