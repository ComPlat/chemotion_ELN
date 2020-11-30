class SharedUserAsJson < ActiveRecord::Migration[4.2]
  def change
    create_function :shared_user_as_json
  end
end
