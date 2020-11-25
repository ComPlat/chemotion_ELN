# frozen_string_literal: true

# Add column: is_generic, position to table: Element_Klass
class AddCustomizableKlass < ActiveRecord::Migration
  def up
    add_column :element_klasses, :is_generic, :boolean, null: false, default: true unless column_exists? :element_klasses, :is_generic
    add_column :element_klasses, :place, :integer, null: false, default: 100 unless column_exists? :element_klasses, :place

    API::ELEMENTS.reverse.each_with_index do |element, idx|
      klass = ElementKlass.find_or_create_by(name: element)
      attributes = { label: element.split('_').map(&:capitalize).join(' '), desc: "ELN #{element.split('_').map(&:capitalize).join(' ')}", icon_name: "icon-#{element}", klass_prefix: '', properties_template: {}, is_generic: false, place: idx }
      klass&.update(attributes)
    end
  end

  def down
    remove_column :element_klasses, :is_generic, :boolean, null: false, default: true if column_exists? :element_klasses, :is_generic
    remove_column :element_klasses, :place, :integer, null: false, default: 100 if column_exists? :element_klasses, :place
  end
end
