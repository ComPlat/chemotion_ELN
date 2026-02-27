# frozen_string_literal: true

module AttachmentHelpers
  extend Grape::API::Helpers

  def read_access?(attachment, user)
    element = attachment.root_element
    return true if element == user

    policy = ElementPolicy.new(user, element)
    read_access_on_element = policy.read?
    read_access_on_dataset = policy.read_dataset?

    read_access_on_element && read_access_on_dataset
  end

  def write_access?(attachment, user)
    element = attachment.root_element
    return true if element == user

    policy = ElementPolicy.new(user, element)
    update_access_on_element = policy.update?
    read_access_on_dataset = policy.read_dataset?

    update_access_on_element && read_access_on_dataset
  end
end
