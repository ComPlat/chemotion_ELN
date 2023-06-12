# frozen_string_literal: true

class CollectionAclPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def take_ownership?
    collection_acl = CollectionAcl.find_by(user_id: @user.id, collection_id: @record.id)
    return false if collection_acl.nil?

    collection_acl.permission_level >= 5
  end
end
