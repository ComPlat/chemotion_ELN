# frozen_string_literal: true

class Versioning::Reverters::ResearchPlanMetadataReverter < Versioning::Reverters::BaseReverter
  def self.scope
    ResearchPlanMetadata.with_deleted
  end
end
