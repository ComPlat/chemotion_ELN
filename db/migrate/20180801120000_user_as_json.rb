class UserAsJson < ActiveRecord::Migration[4.2]
  def change
    create_function :user_as_json
  end
end
