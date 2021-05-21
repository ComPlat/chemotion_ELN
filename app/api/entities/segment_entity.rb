# frozen_string_literal: true

# Entity module
module Entities
  # Segment entity
  class SegmentEntity < Grape::Entity
    expose :id, :segment_klass_id, :element_type, :element_id, :properties

    def properties
      return unless object.respond_to? :properties

      object&.properties.keys.each do |key|
        field_sample_molecules = object&.properties[key]['fields'].select { |ss| ss['type'] == 'drag_molecule' }
        field_sample_molecules.each do |field|
          idx = object&.properties[key]['fields'].index(field)
          sid = field.dig('value', 'el_id')
          next unless sid.present?

          el = Molecule.find_by(id: sid)
          next unless el.present?
          next unless object&.properties.dig(key, 'fields', idx, 'value').present?

          object&.properties[key]['fields'][idx]['value']['el_svg'] = File.join('/images', 'molecules', el.molecule_svg_file)
        end
      end
      object&.properties
    end
  end
end
