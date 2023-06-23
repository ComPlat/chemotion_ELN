const formatDate = (dateString) => {
  const [datePart, timePart] = dateString.split(', ');
  const [day, month, year] = datePart.split('.');
  const [hours, minutes, seconds] = timePart.split(':');

  // format date to js readable date
  const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

  const creationDateObj = new Date(formattedDate);

  // local timezone offset
  const timeZoneOffset = creationDateObj.getTimezoneOffset();
  const offsetHours = Math.trunc(timeZoneOffset / 60);
  const offsetMinutes = timeZoneOffset % 60;

  // apply time offset
  creationDateObj.setHours(creationDateObj.getHours() + offsetHours);
  creationDateObj.setMinutes(creationDateObj.getMinutes() + offsetMinutes);

  // format date style to Intl.DateTimeFormat
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return dateFormatter.format(creationDateObj);
};
export default formatDate;
