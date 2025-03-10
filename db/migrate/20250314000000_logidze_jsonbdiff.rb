# frozen_string_literal: true

class LogidzeJsonbdiff < ActiveRecord::Migration[5.2]
  def change
    reversible do |dir|
      dir.up do
        create_function :logidze_jsonb_diff, version: 1
      end
    end
  end
end
