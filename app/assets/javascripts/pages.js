
showExampleLabel = function() {
  var prefix = $('input#reaction-name-prefix').val();
  var counter = parseInt($('input#reactions-count').val());
  var user_name_abbr = $('input#name_abbreviation').val();
  var reaction_label = user_name_abbr + '-' + prefix + (counter + 1)
  $('span#reaction-label-example').text(reaction_label);
}

$(function() {
  showExampleLabel();
});
