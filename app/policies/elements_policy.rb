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
    return true if records.empty?

    records.map { |r| ElementPolicy.new(user, r).share? }.all?
  end

  def destroy?
    return true if records.empty?

    records.map { |r| ElementPolicy.new(user, r).destroy? }.all?
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
