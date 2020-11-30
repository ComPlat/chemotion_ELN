class AddTypeToUsers < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :type, :string, default: 'Person'  unless column_exists? :users, :type
    User.reset_column_information
    User.all.each do |user|
      user.type = 'Person'
      user.save!
    end
  end
end
