document.querySelectorAll(".affiliation-line").forEach(box => {
  let delButton = box.querySelector('td > a.del-affiliation'),
    delInput = box.querySelector('input[name*=destroy]'),
    fromCell = box.querySelector('.affiliation_from'),
    toCell = box.querySelector('.affiliation_to'),
    fromInput = box.querySelector('input[name*=from]'),
    toInput = box.querySelector('input[name*=to]');

  delButton.addEventListener("click", (e) => {
    box.classList.toggle('strokeout');
    box.classList.toggle('danger');
    let span = delButton.querySelector('span');
    span.classList.toggle('glyphicon-trash');
    span.classList.toggle('fa');
    span.classList.toggle('fa-undo');
    if (delInput.value == 't') { delInput.value = null } else { delInput.value = 't' }
  });

  fromCell.addEventListener("mouseenter", (e) => {
    e.stopPropagation();
    let input = document.createElement('input');
    input.classList.add("form-control");
    input.setAttribute("type", "month");
    input.value = fromInput.value;
    fromCell.innerHTML = '';
    fromCell.appendChild(input);
    fromCell.querySelector('input').focus();
  });

  fromCell.addEventListener("mouseleave", (e) => {
    var val = fromCell.querySelector('input').value;
    fromCell.textContent = val;
    fromInput.value = val;
  });

  toCell.addEventListener("mouseenter", (e) => {
    e.stopPropagation();
    let input = document.createElement('input');
    input.classList.add("form-control");
    input.setAttribute("type", "month");
    input.value = toInput.value;
    toCell.innerHTML = '';
    toCell.appendChild(input);
    toCell.querySelector('input').focus();
  });

  toCell.addEventListener("mouseleave", (e) => {
    var val = toCell.querySelector('input').value;
    toCell.textContent = val;
    toInput.value = val;
  });
})
