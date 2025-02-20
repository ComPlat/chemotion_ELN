# frozen_string_literal: true

class Versioning::Reverters::ElementalCompositionReverter < Versioning::Reverters::BaseReverter
  def self.scope
    ElementalComposition
  end
end
