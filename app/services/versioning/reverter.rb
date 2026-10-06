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

    # One transaction for the whole request: it is applied completely or not at all, including side effects such
    # as the container hierarchy rows a restore inserts.
    def call
      ActiveRecord::Base.transaction do
        changes.each do |change|
          classname = change['klass_name']
          raise StandardError, "Unknown reverter type: #{classname}" unless ALLOWED_REVERTERS.include?(classname)

          begin
            "Versioning::Reverters::#{classname}Reverter".safe_constantize.call(change)
          rescue StandardError => e
            raise StandardError, "Error processing #{classname}: #{e.message}"
          end
        end
      end
    end
  end
end
