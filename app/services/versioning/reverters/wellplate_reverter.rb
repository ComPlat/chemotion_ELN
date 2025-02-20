# frozen_string_literal: true

class Versioning::Reverters::WellplateReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Wellplate.with_deleted
  end
end
