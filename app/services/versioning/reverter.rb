# frozen_string_literal: true

module Versioning
  class Reverter
    include ActiveModel::Model

    attr_accessor :changes

    ALLOWED_REVERTERS = %w[Attachment Chemical Component Container DeviceDescription ElementalComposition Reaction
                           ReactionsSample ResearchPlan ResearchPlanMetadata Residue
                           Sample Screen Wellplate Well].freeze

    def self.call(changes)
      new(changes: changes).call
    end

    def call
      errors = []

      changes.each do |change|
        classname = change['klass_name']
        unless ALLOWED_REVERTERS.include?(classname)
          errors << "Unknown reverter type: #{classname}"
          next
        end

        begin
          reverter_class = "Versioning::Reverters::#{classname}Reverter".safe_constantize
          reverter_class.call(change)
        rescue StandardError => e
          errors << "Error processing #{classname}: #{e.message}"
        end
      end

      raise StandardError, errors.join(', ') if errors.any?
    end
  end
end
