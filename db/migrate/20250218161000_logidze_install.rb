# frozen_string_literal: true

class LogidzeInstall < ActiveRecord::Migration[5.2]
  def change
    reversible do |dir|
      dir.up do
        create_function :logidze_snapshot, version: 3
        create_function :logidze_logger, version: 2
        create_function :logidze_version, version: 2
        create_function :logidze_compact_history, version: 1
        create_function :logidze_capture_exception, version: 1
        create_function :logidze_filter_keys, version: 1
      end

      dir.down do
        execute 'DROP FUNCTION IF EXISTS logidze_filter_keys(jsonb, text[], boolean) CASCADE'
        execute 'DROP FUNCTION IF EXISTS logidze_capture_exception(jsonb) CASCADE'
        execute 'DROP FUNCTION IF EXISTS logidze_compact_history(jsonb, integer) CASCADE'
        execute 'DROP FUNCTION IF EXISTS logidze_version(bigint, jsonb, timestamp with time zone) CASCADE'
        execute 'DROP FUNCTION IF EXISTS logidze_logger() CASCADE'
        execute 'DROP FUNCTION IF EXISTS logidze_snapshot(jsonb, text, text[], boolean) CASCADE'
      end
    end
  end
end
