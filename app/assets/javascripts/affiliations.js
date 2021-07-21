function attachAutoComplete(type, elementId) {
  var sourceData = []
  fetch(
    '/api/v1/public/affiliations/' + type
  )
    .then(response => response.json())
    .then(data => {
      sourceData = data.affiliations
      var elementSelector = 'input[id="' + elementId + '"]'
      var country = new autoComplete({
        selector: elementSelector,
        minChars: 2,
        source: function (term, suggest) {
          term = term.toLowerCase()
          var matches = [];
          for (i = 0; i < sourceData.length; i++) {
            if (~sourceData[i].toLowerCase().indexOf(term)) {
              matches.push(sourceData[i])
            }
          }
          suggest(matches)
        }
      })
    }).catch(error => {
      // Handle error
      console.log(error)
    });;
}

(function () {
  document.querySelector("form").addEventListener("keypress", (e) => function (e) {
    if (e.keyCode == 13) {
      return false;
    }
  })

  attachAutoComplete("countries", "country-select")
  attachAutoComplete("organizations", "organization-select")
  attachAutoComplete("departments", "department-select")
  attachAutoComplete("groups", "group-select")

  let userEmailInput = document.querySelector("input#user_email")
  if (userEmailInput) {
    userEmailInput.addEventListener("focusout", (e) => {
        var email = e.target.value, domain_match, domain;
        if (!email || !(domain_match = email.match(/\@(.*)/))) { return }
        domain = domain_match[1]
        fetch(
          '/api/v1/public/affiliations/swot?domain=' + encodeURIComponent(domain)
        )
        .then(response => response.json())
        .then(organization => {
          if (organization) {
            document.querySelector("input#organization-select").value = organization;
          }
        });
      }
    );
  }
})();