# frozen_string_literal: true

# Element Serializer
class ElementSerializer < ActiveModel::Serializer
  attributes *DetailLevels::Element.new.base_attributes

  has_one :container, serializer: ContainerSerializer
  has_one :element_klass
  has_one :tag
  has_many :segments

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
    object.properties['layers']&.keys.each do |key|
      # layer = object.properties[key]
      field_sample_molecules = object.properties['layers'][key]['fields'].select { |ss| ss['type'] == 'drag_sample' || ss['type'] == 'drag_molecule' }
      field_sample_molecules.each do |field|
        idx = object.properties['layers'][key]['fields'].index(field)
        sid = field.dig('value', 'el_id')
        next unless sid.present?

        el = field['type'] == 'drag_sample' ? Sample.find_by(id: sid) : Molecule.find_by(id: sid)
        next unless el.present?
        next unless object.properties.dig('layers', key, 'fields', idx, 'value').present?

        object.properties['layers'][key]['fields'][idx]['value']['el_label'] = el.short_label if field['type'] == 'drag_sample'
        object.properties['layers'][key]['fields'][idx]['value']['el_tip'] = el.short_label if field['type'] == 'drag_sample'
        object.properties['layers'][key]['fields'][idx]['value']['el_svg'] = field['type'] == 'drag_sample' ? el.get_svg_path : File.join('/images', 'molecules', el.molecule_svg_file)
      end

      field_tables = object.properties['layers'][key]['fields'].select { |ss| ss['type'] == 'table' }
      field_tables.each do |field|
        next unless field['sub_values'].present? && field['sub_fields'].present?

        field_table_molecules = field['sub_fields'].select { |ss| ss['type'] == 'drag_molecule' }
        next unless field_table_molecules.present?

        col_ids = field_table_molecules.map { |x| x.values[0] }
        col_ids.each do |col_id|
          field_table_values = field['sub_values'].each do |sub_value|
            next unless sub_value[col_id].present? && sub_value[col_id]['value'].present? && sub_value[col_id]['value']['el_id'].present?

            find_mol = Molecule.find_by(id: sub_value[col_id]['value']['el_id'])
            next unless find_mol.present?

            sub_value[col_id]['value']['el_svg'] = File.join('/images', 'molecules', find_mol.molecule_svg_file)
            sub_value[col_id]['value']['el_inchikey'] = find_mol.inchikey
            sub_value[col_id]['value']['el_smiles'] = find_mol.cano_smiles
            sub_value[col_id]['value']['el_iupac'] = find_mol.iupac_name
            sub_value[col_id]['value']['el_molecular_weight'] = find_mol.molecular_weight
          end
        end
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
