class UserAsJson < ActiveRecord::Migration
  def change
    create_function :user_as_json
  end
end
