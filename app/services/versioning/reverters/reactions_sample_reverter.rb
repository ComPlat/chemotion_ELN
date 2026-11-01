# frozen_string_literal: true

class Versioning::Reverters::ReactionsSampleReverter < Versioning::Reverters::BaseReverter
  def self.scope
    ReactionsSample.with_deleted
  end

  def call
    super
    record.reaction.save # Update svg file
  end
end
