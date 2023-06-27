import moment from 'moment';

const formatDate = (dateString) => {
  const date = moment(dateString, 'DD.MM.YYYY, HH:mm Z');

  const localDate = date.local();

  const formattedDate = localDate.format('LLLL');

  return formattedDate;
};

export default formatDate;
