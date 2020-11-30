# frozen_string_literal: true

# A class to change the type of column boiling_point and melting_point to numrange
class ChangeBoilingMeltingType < ActiveRecord::Migration[4.2]
  def up
    change_column :samples, :boiling_point, 'numrange USING numrange(boiling_point::numeric, null)'
    change_column :samples, :melting_point, 'numrange USING numrange(melting_point::numeric, null)'
  end
  def down
    change_column :samples, :boiling_point, 'float USING lower(boiling_point)'
    change_column :samples, :melting_point, 'float USING lower(melting_point)'
  end
end
