class ElementPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def self.update?(user, record)
    new(user, record).update?
  end

  # A user can read/write/share an element if
  # 1. there exists an unshared collection which he owns and that contains the element or
  # 2. the user has been shared a collection containing the element with an according permission level
  def read?
    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(0)
  end

  def update?
    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(1)
  end

  def copy?
    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(1)
  end

  def share?
    return true unless record

    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(2)
  end

  def destroy?
    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(3)
  end

  def import?
    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(4)
  end

  def pass_ownership?
    record_is_in_own_collection? || record_shared_with_minimum_permission_level?(6)
  end

  def scope
    Pundit.policy_scope!(user, record.class)
  end

  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      scope
    end
  end

  private


  def user_ids
    user.group_ids + [user.id]
  end

  def record_is_in_own_collection?
    record.collections.where(user: user).any?
  end

  def record_shared_with_minimum_permission_level?(permission_level)
    record
      .collections
      .shared_with_minimum_permission_level(user, permission_level)
      .any?
  end
end
