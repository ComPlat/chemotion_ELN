# frozen_string_literal: true

module Entities
  class ApplicationEntity < Grape::Entity
    format_with(:eln_timestamp) do |datetime|
      datetime.present? ? I18n.l(datetime, format: :eln_timestamp) : nil
    end

    def self.expose!(*fields, **args)
      anonymize_below = args.delete(:anonymize_below) || 0
      anonymize_with = args.delete(:anonymize_with) || '***'

      Array(fields).each do |field|
        expose(field, args) do |represented_object, options|
          if detail_levels[represented_object.class] < anonymize_below
            anonymize_with
          elsif respond_to?(field) # Entity has a method with the same name
            send(field)
          else
            represented_object[field] # works both for AR and Hash objects
          end
        end
      end
    end

    # def self.with_options(exposure_options)
    #   @exposure_options ||= {}
    #   @previous_exposure_options ||= @exposure_options.deep_dup
    #   @exposure_options.merge!(exposure_options)

    #   yield if block_given?

    #   @expose_options = @previous_exposure_options
    # end

    def self.expose_timestamps(timestamp_fields: %i[created_at updated_at], **additional_args)
      timestamp_fields.each do |field|
        expose field, format_with: :eln_timestamp, **additional_args
      end
    end

    private

    def displayed_in_list?
      options[:displayed_in_list] == true
    end

    def current_user
      raise MissingCurrentUserError.new(self) unless options[:current_user]

      options[:current_user]
    end

    def detail_levels
      maximal_default_levels = Hash.new(10) # every requested detail level will be returned as 10
      return maximal_default_levels if !options.key?(:detail_levels) || options[:detail_levels].empty?

      options[:detail_levels]
    end

    class EntityError < StandardError
      MESSAGE = 'OVERRIDE_ME_IN_SUBCLASSES'

      def initialize(object)
        klass = object.is_a?(Class) ? object : object.class
        super(format(message, klass))
      end
    end

    class MissingCurrentUserError < EntityError
      MESSAGE = '%s requires a current user to work properly'
    end
  end
end
