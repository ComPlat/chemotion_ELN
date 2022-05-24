# frozen_string_literal: true

module Chemscanner
  # Chemscanner::Scheme serializer
  class StorageSchemeSerializer < ActiveModel::Serializer
    attributes :id, :source_id, :version, :file_uuid, :index,
               :extended_metadata, :is_approved, :created_at,
               :reaction_count, :molecule_count

    def source_id
      object.source.id
    end

    def file_uuid
      object.source.file.identifier
    end

    def reaction_count
      object.reactions.count
    end

    def molecule_count
      object.molecules.select { |m| (m.abbreviation || '').empty? }.count
    end

    def reaction_ext_ids
      object.reactions.map(&:external_id)
    end

    def molecule_ext_ids
      object.molecules.map(&:external_id)
    end

    def created_at
      object.created_at&.strftime('%d/%m/%Y %H:%M')
    end
  end
end
