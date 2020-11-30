class CreateFunctionLabelsByUserSample < ActiveRecord::Migration[4.2]
  def change
    create_function :labels_by_user_sample
  end
end
