# frozen_string_literal: true

module Entities
  class ApplicationEntity < Grape::Entity
    CUSTOM_ENTITY_OPTIONS = %i[anonymize_below anonymize_with].freeze

    format_with(:eln_timestamp) do |datetime|
      # datetime.present? ? I18n.l(datetime, format: :eln_iso8601) : nil
      datetime.present? ? I18n.l(datetime, format: :eln_timestamp) : nil
    end

    def self.expose!(*args)
      fields = args.first
      options = args.last.is_a?(Hash) ? args.pop : {}
      options = merge_options(options) # merges additional params set in #with_options
      expose_fields_with_anonymization!(fields, options)
    end

    # rubocop:disable Metrics/MethodLength
    def self.expose_fields_with_anonymization!(fields, options)
      anonymize_below = options[:anonymize_below] || 0
      anonymize_with = options.key?(:anonymize_with) ? options[:anonymize_with] : '***'

      Array(fields).each do |field|
        expose(field, options) do |represented_object, _options|
          if detail_levels[represented_object.class] < anonymize_below
            anonymize_with
          elsif respond_to?(field, true) # Entity has a method with the same name
            send(field)
          elsif represented_object.respond_to?(field)
            represented_object.public_send(field)
          else
            represented_object[field.send(self.class.hash_access)] # works both for AR and Hash objects
          end
        end
      end
    end
    private_class_method :expose_fields_with_anonymization!
    # rubocop:enable Metrics/MethodLength

    def self.expose_timestamps(timestamp_fields: %i[created_at updated_at], **additional_args)
      timestamp_fields.each do |field|
        expose field, format_with: :eln_timestamp, **additional_args
      end
    end

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
    private_class_method :valid_options

    private

    def displayed_in_list?
      options[:displayed_in_list] == true
    end

    def current_user
      unless options[:current_user]
        raise MissingCurrentUserError, "#{self.class} requires a current user to work properly"
      end

      options[:current_user]
    end

    def detail_levels
      maximal_default_levels = Hash.new(10) # every requested detail level will be returned as 10
      minimal_default_levels = Hash.new(0) # every requested detail level will be returned as 0
      return maximal_default_levels if !options.key?(:detail_levels) || options[:detail_levels].empty?

      # When explicitly configured detail levels are available, we want to return only those and all other
      # requests (by using `detail_levels[SomeUnconfiguredModel]`) should return the minimum detail level
      minimal_default_levels.merge(options[:detail_levels])
    end

    def can_copy
      options[:policy].try(:copy?) || false
    end

    class MissingCurrentUserError < StandardError
    end
  end
end
