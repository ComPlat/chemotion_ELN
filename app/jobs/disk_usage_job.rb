# frozen_string_literal: true

class DiskUsageJob < ApplicationJob
  queue_as :disk_usage

  def perform
    ActiveRecord::Base.connection.execute('update users set used_space = calculate_used_space(id);')
  end
end
