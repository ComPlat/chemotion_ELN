class TableSchemaPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def destroy?
    record.created_by == @user.id
  end
end
