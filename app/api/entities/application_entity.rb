# frozen_string_literal: true

module Entities
  class ApplicationEntity < Grape::Entity
    class MissingCurrentUserError < StandardError
      def initialize(message = '%s requires a current user to work properly', object)
        super(format(message, object.class))
      end
    end

    format_with(:eln_timestamp) do |datetime|
      datetime.present? ? I18n.l(datetime, format: :eln_timestamp) : nil
    end

    def self.detail_level_entities(level_entities_hash = {})
      # Initialize entity list for current subclass. As this is used in class context, it is only defined for the
      # current subclass, not for the whole inheritance hierarchy, which would be the case when using @@some_variable
      @detail_level_entities ||= {}

      # allow method to be used as reader if no data is provided
      return @detail_level_entities if level_entities_hash.empty?

      # validate input
      raise "Keys must be integer" unless level_entities_hash.keys.all?(Integer)
      raise "Values must be subclasses of ApplicationEntity" unless level_entities_hash.values.all? do |klass|
        klass.is_a?(Class) && klass.ancestors.include?(::Entities::ApplicationEntity)
      end

      level_entities_hash.each do |level, entity_class|
        @detail_level_entities[level] = entity_class
      end

      @detail_level_entities
    end

    def self.entity_for_level(level)
      raise "#{self.name} has no detail level entities defined" if detail_level_entities.empty?
      raise "#{self.name} has no defined entity for detail level #{level}" unless detail_level_entities.key?(level)

      detail_level_entities[level]
    end

    def self.expose_timestamps(timestamp_fields: %i[created_at updated_at], **additional_args)
      timestamp_fields.each do |field|
        expose field, format_with: :eln_timestamp, **additional_args
      end
    end

    # Exposes one or more attributes in an anonymized form. The resulting hash will have all
    # the attribute names as keys, but only the anonymized_default as value.
    def self.expose_anonymized(*attributes, with: '***')
      Array(attributes).each do |attribute|
        expose attribute do |_object, _entity_options|
          with
        end
      end
    end

    private

    def displayed_in_list?
      options[:displayed_in_list] == true
    end

    def current_user
      raise MissingCurrentUserError unless options[:current_user]
      options[:current_user]
    end
  end
end
