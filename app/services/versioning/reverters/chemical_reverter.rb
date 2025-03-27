# frozen_string_literal: true

class Versioning::Reverters::ChemicalReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Chemical
  end
end
