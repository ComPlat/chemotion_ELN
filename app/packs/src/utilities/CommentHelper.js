const formatSection = (section, type = '') => {
  const words = type ? section?.replace(`${type}_`, '')?.split('_') : section?.replace('_header', '')?.split('_');
  for (let i = 0; i < words?.length; i += 1) {
    words[i] = words[i][0].toUpperCase() + words[i].substr(1);
  }
  return words?.join(' ');
};

const getSectionComments = (comments, section) => {
  return comments?.filter((cmt) => (cmt.section === section));
};
const getAllComments = (comments, section) => comments?.filter((cmt) => (cmt.section !== section));

const selectCurrentUser = (state) => state.currentUser;

const commentActivation = 'commentActivation';

export {
  formatSection,
  getSectionComments,
  getAllComments,
  selectCurrentUser,
  commentActivation,
};
