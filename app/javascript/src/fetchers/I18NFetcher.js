export default class I18NFetcher {
  static fetchAdminMessages(locale) {
    return fetch(`/i18n/admin/${locale}.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .catch((error) => {
        console.error('Error fetching JSON:', error);
        return {};
      });
  }
}