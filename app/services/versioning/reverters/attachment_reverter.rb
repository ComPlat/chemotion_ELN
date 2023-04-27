# frozen_string_literal: true

class Versioning::Reverters::AttachmentReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Attachment
  end
end
