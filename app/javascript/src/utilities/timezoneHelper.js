import moment from 'moment';

// see config/locale/en.yml for the format
const elnTimestampFormat = 'DD.MM.YYYY, HH:mm:ss Z';

const regExpTimestamp = /^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}/;
// Match calendar times with timezone: "28.04.2026, 15:15:00 +0000"
const regExpCalendarTime = /\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2} [+-]\d{4}/g;

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

// convert calendar notification times from UTC to local timezone
// finds time patterns like "28.04.2026, 15:15:00 +0000" and converts them to local time
// formats output as simplified: "28.04.2026, 15:15" (without seconds and timezone)
const convertCalendarNotificationToLocal = (notificationText) => {
  if (!notificationText) return notificationText;

  let converted = notificationText.replace(regExpCalendarTime, (match) => {
    const date = moment(match, elnTimestampFormat, true);
    if (date.isValid()) {
      // Convert to local timezone and format without seconds and timezone offset
      return date.local().format('DD.MM.YYYY, HH:mm');
    }
    return match;
  });

  // Remove trailing time-like patterns (HH:mm format) that might be leftover
  converted = converted.replace(/\s+\d{2}\.\d{2}\s*$/, '');

  return converted;
};

export {
  elnTimestampFormat,
  parseDate,
  formatDate,
  formatTimeStampsOfElement,
  dateToUnixTimestamp,
  convertCalendarNotificationToLocal,
};
