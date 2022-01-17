
function showExampleLabel() {
  var prefix = document.querySelector('input#reaction-name-prefix')?.value;
  var counter = parseInt(document.querySelector('input#reactions-count')?.value);
  var user_name_abbr = document.querySelector('input#name_abbreviation')?.value;
  var reaction_label = user_name_abbr + '-' + prefix + (counter + 1)
  let label = document.querySelector('span#reaction-label-example')
  if (label) {
    label.textContent = reaction_label;
  }
}

(function () {
  showExampleLabel();
})();