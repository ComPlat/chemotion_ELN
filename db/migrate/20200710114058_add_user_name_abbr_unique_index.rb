class AddUserNameAbbrUniqueIndex < ActiveRecord::Migration[4.2]
  def change
    deleted_users = User.only_deleted.where.not(name_abbreviation: nil)

    deleted_users.each do |user|
      user.update_columns(name_abbreviation: nil)
    end

    add_index :users, :name_abbreviation, unique: true, where: 'name_abbreviation IS NOT NULL'
  end
end
