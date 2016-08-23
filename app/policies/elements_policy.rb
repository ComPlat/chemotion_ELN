class ElementsPolicy
  attr_reader :user, :records

  def initialize(user, records)
    @user = user
    @records = records
  end

  def read?
    return true if records.empty?

    records.map { |r| ElementPolicy.new(user, r).read? }.all?
  end

  def share?
    allowed?(1)
  end

  def destroy?
    allowed?(2)
  end

  def allowed?(level = 5)
    return true if records.joins(:collections).where('collections.is_shared IS true').empty?
    owned_record_ids = records.joins(:collections)
      .where('collections.is_shared != true AND collections.user_id = ?',user.id)
      .distinct.pluck(:id)
    return true unless records.where.not(id: owned_record_ids).joins(:collections)
      .where('collections.permission_level > ?',level).empty?
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
