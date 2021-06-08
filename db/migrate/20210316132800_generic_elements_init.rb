# frozen_string_literal: true

# Create generic elements
class GenericElementsInit < ActiveRecord::Migration[4.2]
  class ElementKlass < ActiveRecord::Base
  end

  def self.up
    Matrice.create(name: 'genericElement', enabled: false, label: 'genericElement', include_ids: [], exclude_ids: []) if Matrice.find_by(name: 'genericElement').nil?
    API::ELEMENTS.reverse.each_with_index do |element, idx|
      klass = ElementKlass.find_or_create_by(name: element)
      attributes = { label: element.titleize, desc: "ELN #{element.titleize}", icon_name: "icon-#{element}", klass_prefix: '', properties_template: {}, is_generic: false, place: idx }
      klass&.update(attributes)
    end
  end

  def self.down
    Matrice.find_by(name: 'genericElement')&.really_destroy!
  end
end
