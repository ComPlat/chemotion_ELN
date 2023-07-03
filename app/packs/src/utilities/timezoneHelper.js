import moment from 'moment';

const formatDate = (dateString) => {
  const date = moment(dateString, 'DD.MM.YYYY, HH:mm:ss Z');

  const localDate = date.local();

  const formattedDate = localDate.format('LLLL');

  return formattedDate;
};

// return `Created at: ${formattedCreatedAt} | Updated at: ${formattedUpdatedAt}`;
const formatTimeStampsOfElement = (element) => {
  const { created_at, updated_at } = element;
  const formattedCreatedAt = formatDate(created_at);
  const formattedUpdatedAt = formatDate(updated_at);
  return `Created ${formattedCreatedAt} - Updated ${formattedUpdatedAt}`;
};

export {
  formatDate,
  formatTimeStampsOfElement,
};
