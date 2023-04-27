# frozen_string_literal: true

class Versioning::Reverters::ResidueReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Residue
  end
end
