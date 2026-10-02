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
    element_write_access?(attachment.root_element, user)
  end

  # @param element [ApplicationRecord, User, nil] an attachment's root element
  def element_write_access?(element, user)
    return true if element == user

    # update? already implies read_dataset? (owner, or a share at full detail level >= 3)
    ElementPolicy.new(user, element).update?
  end
end
