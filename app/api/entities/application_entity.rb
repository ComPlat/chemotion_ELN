# frozen_string_literal: true

module Entities
  class ApplicationEntity < Grape::Entity
    format_with(:eln_timestamp) do |datetime|
      I18n.l(datetime, format: :eln_timestamp)
    end

    def self.expose_timestamps(timestamp_fields: %i[created_at updated_at], **additional_args)
      timestamp_fields.each do |field|
        expose field, format_with: :eln_timestamp, **additional_args
      end
    end

    def displayed_in_list?
      options[:displayed_in_list] == true
    end
  end
end
