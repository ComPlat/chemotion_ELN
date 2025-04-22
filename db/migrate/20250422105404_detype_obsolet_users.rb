class DetypeObsoletUsers < ActiveRecord::Migration[6.1]
  class User < ActiveRecord::Base
    self.inheritance_column = nil
    self.table_name = 'users'
  end

  # Operating on soft-deleted records causes issues if those with type `Device`
  # since Device < User has been deprecated and refactor to its own table.
  def up
    User.where(type: 'Device').update_all(type:  'DeviceDeprecated')
  end
end
