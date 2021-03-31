# frozen_string_literal: true

# Element Serializer
class ElementSerializer < ActiveModel::Serializer
  attributes *DetailLevels::Element.new.base_attributes

  has_one :container, serializer: ContainerSerializer
  has_one :element_klass

  def created_at
    object.created_at.strftime('%d.%m.%Y, %H:%M')
  end
  def updated_at
    object.updated_at.strftime('%d.%m.%Y, %H:%M')
  end

  def el_type
    object.element_klass.name
  end

  def properties
    object.properties.keys.each do |key|
      # layer = object.properties[key]
      field_sample_molecules = object.properties[key]['fields'].select { |ss| ss['type'] == 'drag_sample' || ss['type'] == 'drag_molecule' }
      field_sample_molecules.each do |field|
        idx = object.properties[key]['fields'].index(field)
        sid = field.dig('value', 'el_id')
        next unless sid.present?

        el = field['type'] == 'drag_sample' ? Sample.find_by(id: sid) : Molecule.find_by(id: sid)
        next unless el.present?
        next unless object.properties.dig(key, 'fields', idx, 'value').present?

        object.properties[key]['fields'][idx]['value']['el_label'] = el.short_label if field['type'] == 'drag_sample'
        object.properties[key]['fields'][idx]['value']['el_tip'] = el.short_label if field['type'] == 'drag_sample'
        object.properties[key]['fields'][idx]['value']['el_svg'] = field['type'] == 'drag_sample' ? el.get_svg_path : File.join('/images', 'molecules', el.molecule_svg_file)
      end
    end
    object.properties
  end

  def can_copy
    true
  end

  def type
    object.element_klass.name # 'genericEl' #object.type
  end

  def is_restricted
    false
  end

  class Level0 < ActiveModel::Serializer
    include ElementLevelSerializable
    define_restricted_methods_for_level(0)
  end
end

class ElementSerializer::Level10 < ElementSerializer
  alias_method :original_initialize, :initialize
  def initialize(element, nested_detail_levels)
    original_initialize(element)
    @nested_dl = nested_detail_levels
  end
end
