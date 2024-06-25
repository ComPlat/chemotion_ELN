class ElementsPolicy
  attr_reader :user, :records

  def initialize(user, records)
    @user = user
    @records = records
  end

  def read?
    allowed?(0)
  end

  def update?
    allowed?(1)
  end

  def share?
    allowed?(2)
  end

  def destroy?
    allowed?(3)
  end

  def allowed?(level = 5)
    owned_record_ids = records.joins(:collections)
      .where('collections.is_shared IS NOT true AND collections.user_id = ?',user.id)
      .distinct.pluck(:id)
    other_record_ids = records.distinct.pluck(:id) - owned_record_ids

    return true if other_record_ids.empty?
    user_ids = [user.id]+ user.group_ids
    return true unless records.where(id: other_record_ids).joins(:collections)
      .where('collections.permission_level >= ? AND collections.user_id in (?)',level,user_ids).empty?
    return true unless records.where(id: other_record_ids).joins(:collection_acls)
      .where('collection_acls.permission_level >= ? AND collection_acls.user_id in (?)',level,user_ids).empty?
    false
  end

  def scope
    Pundit.policy_scope!(user, records.first.class)
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
end
