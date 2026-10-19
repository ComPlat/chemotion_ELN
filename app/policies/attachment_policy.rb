# frozen_string_literal: true

class AttachmentPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def self.can_upload_chunk?(uuid)
    uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return true if uuid_regex.match?(uuid.to_s.downcase)

    false
  end
end
