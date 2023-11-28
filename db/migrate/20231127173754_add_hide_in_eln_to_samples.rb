# frozen_string_literal: true

class AddHideInElnToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :hide_in_eln, :boolean
  end
end
