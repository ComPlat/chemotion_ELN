# frozen_string_literal: true

class Versioning::Reverters::WellReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Well.with_deleted
  end
end
