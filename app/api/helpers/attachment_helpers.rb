# frozen_string_literal: true

# Grape entry points to {Usecases::Attachments::Access}, the shared attachment access rule.
module AttachmentHelpers
  extend Grape::API::Helpers

  def read_access?(attachment, user)
    Usecases::Attachments::Access.new(user).read?(attachment)
  end

  def write_access?(attachment, user)
    Usecases::Attachments::Access.new(user).write?(attachment)
  end
end
