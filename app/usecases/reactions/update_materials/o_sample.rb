# frozen_string_literal: true

module Usecases
  module Reactions
    class UpdateMaterials
      # Sample structure — nested UpdateMaterials helper (Zeitwerk).
      class OSample < OpenStruct
        def initialize(data)
          # set nested attributes

          %w[residues elemental_compositions].each do |prop|
            prop_value = data.delete(prop) || []

            prop_value.each { |i| i.delete :id }

            next if prop_value.blank?

            data.merge!(
              "#{prop}_attributes" => prop_value,
            )
          end

          if data['elemental_compositions_attributes']
            data['elemental_compositions_attributes'].each do |i|
              i.delete('description')
            end
          end
          data['show_label'] = false if data['show_label'].blank?
          super
        end

        def is_new
          to_boolean super
        end

        def is_split
          to_boolean super
        end

        def to_boolean(string)
          !!string.to_s.match(/^(true|t|yes|y|1)$/i)
        end
      end
    end
  end
end
