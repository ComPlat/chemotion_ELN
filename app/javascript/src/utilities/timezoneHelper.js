import moment from 'moment';

// see config/locale/en.yml for the format
const elnTimestampFormat = 'DD.MM.YYYY, HH:mm:ss Z';

const regExpTimestamp = /^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}/;

const parseDate = (dateString) => {
  if (regExpTimestamp.test(dateString)) {
    const date = moment(dateString, elnTimestampFormat);
    if (date.isValid()) {
      return date;
    }
  }
  // assume ISO 8601 format
  return moment(dateString);
};

const formatDate = (dateString) => {
  const date = parseDate(dateString);

  const localDate = date.local();

  const formattedDate = localDate.format('llll');

  return formattedDate;
};

// return `Created at: ${formattedCreatedAt} | Updated at: ${formattedUpdatedAt}`;
const formatTimeStampsOfElement = (element) => {
  const { created_at, updated_at } = element;
  const formattedCreatedAt = formatDate(created_at);
  const formattedUpdatedAt = formatDate(updated_at);
  return `Created ${formattedCreatedAt} - Updated ${formattedUpdatedAt}`;
};

// convert date to unix timestamp
// @param {string} dateString - date string
// @return {number, null} - unix timestamp
// false if dateString is not a valid date
const dateToUnixTimestamp = (dateString) => {
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return Math.floor(date.getTime() / 1000);
  }
  return null;
};

export {
  elnTimestampFormat,
  parseDate,
  formatDate,
  formatTimeStampsOfElement,
  dateToUnixTimestamp,
};
