# frozen_string_literal: true

module Entities
  class ApplicationEntity < Grape::Entity
    CUSTOM_ENTITY_OPTIONS = %i[anonymize_below anonymize_with].freeze

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

    def self.expose_timestamps(timestamp_fields: %i[created_at updated_at], **additional_args)
      timestamp_fields.each do |field|
        expose field, format_with: :eln_timestamp, **additional_args
      end
    end

    private

    # overridden method from Grape::Entity to support our custom anonymization options
    # https://github.com/ruby-grape/grape-entity/blob/v0.7.1/lib/grape_entity/entity.rb#L565
    def self.valid_options(options)
      options.each_key do |key|
        next if OPTIONS.include?(key) || CUSTOM_ENTITY_OPTIONS.include?(key)

        raise ArgumentError, "#{key.inspect} is not a valid option."
      end

      options[:using] = options.delete(:with) if options.key?(:with)
      options
    end

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
