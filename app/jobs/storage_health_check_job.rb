# frozen_string_literal: true

# Emails admins when a storage tier goes missing. Off by default; enable it in
# config/initializers/delayed_job_config.rb.
class StorageHealthCheckJob < ApplicationJob
  queue_as :storage_health

  def perform
    problems = StorageHealth.problems(verify_files: true)
    return if problems.empty?

    problems.each { |problem| Rails.logger.warn("[StorageHealth] #{problem}") }
    StorageHealthMailer.unavailable(problems).deliver_now
  end
end
