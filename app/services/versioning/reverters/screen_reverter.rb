# frozen_string_literal: true

class Versioning::Reverters::ScreenReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Screen.with_deleted
  end
end
