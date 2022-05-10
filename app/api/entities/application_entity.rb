# frozen_string_literal: true

module Entities
  class ApplicationEntity < Grape::Entity
    format_with(:eln_timestamp) do |datetime|
      I18n.l(datetime, format: :eln_timestamp)
    end

    def self.expose_timestamps(timestamp_fields: %i[created_at updated_at])
      timestamp_fields.each do |field|
        expose field, format_with: :eln_timestamp
      end
    end
  end
end
