export const filePreview = (file) => {
  return file.type.split('/')[0] === 'image' ? file.preview : '/images/wild_card/not_available.svg';
};

export const formatSection = (section, type = '') => {
  const words = type ? section.replace(`${type}_`, '').split('_') : section.replace('_header', '').split('_');

  for (let i = 0; i < words.length; i += 1) {
    words[i] = words[i][0].toUpperCase() + words[i].substr(1);
  }
  return words.join(' ');
};
