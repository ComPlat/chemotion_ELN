$(".affiliation-line").each(function(id){
  let $this = $(this),
    delButton = $this.find('> td > a.del-affiliation'),
    delInput = $this.find('> input[name*=destroy]'),
    fromCell = $this.find('> .affiliation_from'),
    toCell = $this.find('> .affiliation_to'),
    fromInput = $this.find('> input[name*=from]'),
    toInput = $this.find('> input[name*=to]');

  delButton.click(function(){
    $this.toggleClass('strokeout danger');
    delButton.find('> span').toggleClass('glyphicon-trash fa fa-undo');
    if (delInput.val() == 't'){ delInput.val(null)} else{delInput.val('t')}
  });
  fromCell.mouseenter(function(e){
    e.stopPropagation();
    let input = $('<input class="form" type="month" />');
    input.val(fromInput.val());
    fromCell.html(input);
    fromCell.find('> input').focus();
  }).mouseleave(function(){
    var val = fromCell.find('> input').val();
    fromCell.html(val)
    fromInput.val(val)
  });
  toCell.mouseenter(function(e){
    e.stopPropagation();
    let input = $('<input class="form-control" type="month" />');
    input.val(toInput.val());
    toCell.html(input);
    toCell.find('> input').focus();
  }).mouseleave(function(){
    var val = toCell.find('> input').val();
    toCell.html(val)
    toInput.val(val)
  });
})
