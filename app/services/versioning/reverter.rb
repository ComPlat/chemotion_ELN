# frozen_string_literal: true

# rubocop:disable Metrics/CyclomaticComplexity

module Versioning
  class Reverter
    include ActiveModel::Model

    attr_accessor :changes

    def self.call(changes)
      new(changes: changes).call
    end

    def call
      changes.each do |change|
        case change['klass_name']
        when 'Attachment'
          Versioning::Reverters::AttachmentReverter.call(change)
        when 'Container'
          Versioning::Reverters::ContainerReverter.call(change)
        when 'ElementalComposition'
          Versioning::Reverters::ElementalCompositionReverter.call(change)
        when 'Reaction'
          Versioning::Reverters::ReactionReverter.call(change)
        when 'ReactionsSample'
          Versioning::Reverters::ReactionsSampleReverter.call(change)
        when 'ResearchPlan'
          Versioning::Reverters::ResearchPlanReverter.call(change)
        when 'ResearchPlanMetadata'
          Versioning::Reverters::ResearchPlanMetadataReverter.call(change)
        when 'Residue'
          Versioning::Reverters::ResidueReverter.call(change)
        when 'Sample'
          Versioning::Reverters::SampleReverter.call(change)
        when 'Screen'
          Versioning::Reverters::ScreenReverter.call(change)
        when 'Wellplate'
          Versioning::Reverters::WellplateReverter.call(change)
        end
      end
    end
  end
end
# rubocop:enable Metrics/CyclomaticComplexity
