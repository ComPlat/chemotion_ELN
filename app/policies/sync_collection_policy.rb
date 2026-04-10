class SyncCollectionPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def take_ownership?
    (record.user_id == @user.id && record.permission_level >= 5)
  end
end
