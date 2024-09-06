# frozen_string_literal: true

module AttachmentHelpers
  extend Grape::API::Helpers

  def read_access?(attachment, user)
    element = attachment.root_element
    return true if element == user

    read_access_on_element = ElementPolicy.new(user, element).read?
    read_access_on_dataset = ElementPermissionProxy.new(user, element, [user.id]).read_dataset?

    read_access_on_element && read_access_on_dataset
  end

  def write_access?(attachment, user)
    element = attachment.root_element
    return true if element == user

    update_access_on_element = ElementPolicy.new(user, element).update?
    read_access_on_dataset = ElementPermissionProxy.new(user, element, [user.id]).read_dataset?

    update_access_on_element && read_access_on_dataset
  end
end
