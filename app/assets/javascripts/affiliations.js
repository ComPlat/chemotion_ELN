function attachAutoComplete(type, elementId) {
  let sourceData = [];
  fetch(
    `/api/v1/public/affiliations/${type}`
  )
    .then((response) => response.json())
    .then((data) => {
      sourceData = data;

      const country = new autoComplete({
        selector: `#${elementId}`,
        threshold: 2,
        data: {
          src: sourceData
        },
        submit: true,
        maxResults: 10,
        resultItem: {
          tag: 'li',
          class: 'autoComplete_result',
          element: (item, data) => {
            item.setAttribute('data-parent', 'food-item');
          },
          highlight: 'autoComplete_highlight',
          selected: 'autoComplete_selected'
        },
      });
    }).catch((error) => {
      // Handle error
      console.log(error);
    });
}

(function () {
  document.querySelector('form').addEventListener('keypress', (e) => function (e) {
    if (e.keyCode == 13) {
      return false;
    }
  });

  attachAutoComplete('countries', 'country-select');
  attachAutoComplete('organizations', 'organization-select');
  attachAutoComplete('departments', 'department-select');
  attachAutoComplete('groups', 'group-select');

  const userEmailInput = document.querySelector('input#user_email');
  if (userEmailInput) {
    userEmailInput.addEventListener('focusout', (e) => {
      const email = e.target.value;
      let domain_match;
      let domain;
      if (!email || !(domain_match = email.match(/\@(.*)/))) { return; }
      domain = domain_match[1];
      fetch(
        `/api/v1/public/affiliations/swot?domain=${encodeURIComponent(domain)}`
      )
        .then((response) => response.json())
        .then((organization) => {
          if (organization) {
            document.querySelector('input#organization-select').value = organization;
          }
        });
    });
  }
}());
