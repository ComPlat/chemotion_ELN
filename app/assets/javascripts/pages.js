const showExampleLabel = () => {
  const prefix = document.querySelector('input#reaction-name-prefix')?.value;
  const counter = parseInt(document.querySelector('input#reactions-count')?.value, 10);
  const usernameAbbr = document.querySelector('input#name_abbreviation')?.value;
  const reactionLabel = `${usernameAbbr}-${prefix}${counter + 1}`;
  const label = document.querySelector('span#reaction-label-example');
  if (label) {
    label.textContent = reactionLabel;
  }
};

// Fill in label initially after page load
showExampleLabel();
