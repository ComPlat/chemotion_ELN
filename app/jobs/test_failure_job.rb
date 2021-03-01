# for api test in spec/api/delayed_job_api_spec.rb
class TestFailureJob < ActiveJob::Base
  queue_as :test

  def perform
    puts 'failed ' + TestFailureJob.name
    raise "error"
  end
end
