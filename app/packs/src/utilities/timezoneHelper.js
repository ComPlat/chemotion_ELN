import moment from 'moment';

const formatDate = (dateString) => {
  const date = moment.utc(dateString, 'DD.MM.YYYY, HH:mm');

  const localDate = date.local();

  const formattedDate = localDate.format('LLLL');

  return formattedDate;
};

export default formatDate;
