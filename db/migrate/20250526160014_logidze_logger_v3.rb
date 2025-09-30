# frozen_string_literal: true

class LogidzeLoggerV3 < ActiveRecord::Migration[6.1]
  def up
    create_function :logidze_logger, version: 3
  end

  def down
    create_function :logidze_logger, version: 2
  end
end
