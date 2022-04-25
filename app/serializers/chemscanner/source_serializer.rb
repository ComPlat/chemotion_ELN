# frozen_string_literal: true

module Chemscanner
  # Chemscanner::Source serializer
  class SourceSerializer < ActiveModel::Serializer
    attributes :id, :parent_id, :uuid, :file_name, :extended_metadata, :created_at

    def uuid
      object.file_uuid
    end

    def file_name
      object.file.filename
    end

    def created_at
      return '' if object&.created_at.nil?

      object.created_at.strftime('%d/%m/%Y %H:%M')
    end
  end
end
