function attachAutoComplete(type, elementId) {
  const sourceData = [];
  fetch(
    `/api/v1/public/affiliations/${type}`
  )
    .then((response) => response.json())
    .then((data) => {
      const elementSelector = `input[id="${elementId}"]`;
      const country = new autoComplete({
        selector: elementSelector,
        minChars: 2,
        source(term, suggest) {
          term = term.toLowerCase();
          const matches = [];
          for (i = 0; i < data.length; i++) {
            if (~data[i].toLowerCase().indexOf(term)) {
              matches.push(data[i]);
            }
          }
          suggest(matches);
        }
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

//  const userEmailInput = document.querySelector('input#user_email');
//  if (userEmailInput) {
//    userEmailInput.addEventListener('focusout', (e) => {
//      const email = e.target.value; let domain_match; let
//        domain;
//      if (!email || !(domain_match = email.match(/\@(.*)/))) { return; }
//      domain = domain_match[1];
//      fetch(
//        `/api/v1/public/affiliations/swot?domain=${encodeURIComponent(domain)}`
//      )
//        .then((response) => response.json())
//        .then((organization) => {
//          if (organization) {
//            document.querySelector('input#organization-select').value = organization;
//          }
//        });
//    });
//  }
}());
