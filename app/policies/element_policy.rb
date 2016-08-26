class ElementPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  # A user can read/write/share an element if
  # 1. there exists an unshared collection which he owns and that contains the sample or
  # 2. there exists a shared collection, containing the sample, which he owns and where the user has
  # the required permission_level
  def read?
    any_unshared_collection?(user_collections) || maximum_permission_level(user_collections) >= 0
  end

  def update?
    any_unshared_collection?(user_collections) || maximum_permission_level(user_collections) >= 1
  end

  def share?
    return true unless record

    any_unshared_collection?(user_collections) || maximum_permission_level(user_collections) >= 2
  end

  def destroy?
    any_unshared_collection?(user_collections) || maximum_permission_level(user_collections) >= 3
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

  def maximum_permission_level(collections)
    collections.pluck(:permission_level).max || -1
  end

  def user_collections
    user_ids = user.group_ids + [user.id]
    record.collections.where(user_id: user_ids)
  end

  # TODO move to appropriate class
  def any_unshared_collection?(collections)
    collections.pluck(:is_shared).map(&:!).any?
  end
end
