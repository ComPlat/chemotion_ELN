# frozen_string_literal: true

class Versioning::Reverters::ResearchPlanReverter < Versioning::Reverters::BaseReverter
  def self.scope
    ResearchPlan.with_deleted
  end
end
