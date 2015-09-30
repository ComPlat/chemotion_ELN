class CollectionPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def take_ownership?
    (record.user_id == @user.id && record.permission_level >= 4) || (record.user_id == @user.id && record.is_shared == false)
  end
end
