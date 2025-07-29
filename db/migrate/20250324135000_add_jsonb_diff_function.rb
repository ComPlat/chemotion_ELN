# frozen_string_literal: true

class AddJsonbDiffFunction < ActiveRecord::Migration[6.1]
  def change
    reversible do |direction|
      direction.up do
        create_function :logidze_jsonb_diff
      end
      direction.down do
        execute 'DROP FUNCTION IF EXISTS jsonb_diff;'
      end
    end
  end
end
