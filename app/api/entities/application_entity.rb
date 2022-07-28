# frozen_string_literal: true

module Entities
  class ApplicationEntity < Grape::Entity
    class MissingCurrentUserError < StandardError
      def initialize(message = '%s requires a current user to work properly', object)
        super(format(message, object.class))
      end
    end

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

    def current_user
      raise MissingCurrentUserError unless options[:current_user]
      options[:current_user]
    end
  end
end
