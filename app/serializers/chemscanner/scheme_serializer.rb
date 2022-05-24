# frozen_string_literal: true

module Chemscanner
  # Chemscanner::Scheme serializer
  class SchemeSerializer < ActiveModel::Serializer
    attributes :id, :source_id, :version, :file_id, :file_uuid, :index,
               :extended_metadata, :is_approved, :image_data,
               :reaction_ext_ids, :molecule_ext_ids, :created_at,
               :reaction_count, :molecule_count

    def source_id
      object.source.id
    end

    def file_id
      object.source.file.id
    end

    def file_uuid
      object.source.file.identifier
    end

    def reaction_ext_ids
      object.reactions.map(&:external_id)
    end

    def molecule_ext_ids
      object.molecules.map(&:external_id)
    end

    def reaction_count
      object.reactions.count
    end

    def molecule_count
      object.molecules.select { |m| (m.abbreviation || '').empty? }.count
    end

    def molecule_warnings
      object.molecules.map { |m| m.extended_metadata[:warnings] }
    end

    def reaction_warnings
      object.reactions.map { |r|
        { id: r.id, warnings: r.extended_metadata[:warnings] }
      }
    end

    def created_at
      return '' if object&.created_at.nil?

      object.created_at.strftime('%d/%m/%Y %H:%M')
    end

    # def filter(keys)
    #   include_image = if serialization_options.key?(:image)
    #                     serialization_options[:image]
    #                   else
    #                     true
    #                   end

    #   return keys if include_image

    #   keys - [:image_data]
    # end
  end
end
