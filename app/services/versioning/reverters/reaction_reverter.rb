# frozen_string_literal: true

class Versioning::Reverters::ReactionReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Reaction.with_deleted
  end
end
