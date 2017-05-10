attachAutoComplete = function(type, elementId) {
  var sourceData = []
  $.getJSON('/api/v1/public/affiliations/' + type, function(data) {
    sourceData = data.affiliations
  })

  var elementSelector = 'input[id="' + elementId + '"]'
  var country = new autoComplete({
    selector: elementSelector,
    minChars: 2,
    source: function(term, suggest) {
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
}

$(function() {
  $("form").on("keypress", function (e) {
    if (e.keyCode == 13) {
      return false;
    }
  })

  attachAutoComplete("countries", "country-select")
  attachAutoComplete("organizations", "organization-select")
  attachAutoComplete("departments", "department-select")
  attachAutoComplete("groups", "group-select")
})
