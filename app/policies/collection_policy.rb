class CollectionPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def read_metadata?
    # TODO: implement metadata specific permissions
    take_ownership?
  end

  def update_metadata?
    read_metadata?
  end

  def create_archive?
    read_metadata?
  end
end
