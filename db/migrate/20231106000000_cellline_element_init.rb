class CelllineElementInit < ActiveRecord::Migration[6.1]
  class ElementKlass < ActiveRecord::Base
  end

  def self.up
    klass = ElementKlass.find_or_create_by(name: "cell_line")
    attributes = { label: "cell_line".titleize, desc: "ELN #{"cell_line".titleize}", icon_name: "icon-#{"cell_line"}", klass_prefix: '', properties_template: {}, is_generic: false, place: 5 }
    klass&.update(attributes)
  end
end
