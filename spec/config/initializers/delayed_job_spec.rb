# frozen_string_literal: true

def delayed_job_scope
  Delayed::Job.where.not(cron: nil)
end

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'queuing of a reccuring job through delayed_job initializer' do
  # env variable name that can be used to define the cron schedules
  let(:env_var_names) do
    %w[
      CRON_CONFIG_PC_CID
      CRON_CONFIG_PC_LCSS
      CRON_CONFIG_REFRESH_ELEMENT_TAG
      CRON_CONFIG_DISK_USAGE
    ]
  end
  let(:days_from_now) { [2, 3, 4, 5] }
  # map to week day as integers
  let(:wdays_from_now) { days_from_now.map { |num| Time.zone.now.next_day(num).wday } }
  # map to weekly cron schedules starting in x days
  let(:cron_schedules) { wdays_from_now.map { |wday| "5 5 * * #{wday}" } }
  # set env variables
  let(:env_vars) do
    env_var_names.zip(cron_schedules).map do |var_name, schedule|
      "#{var_name}='#{schedule}'"
    end.join(' ')
  end

  let(:jobs_count_with_correct_run_at) do
    days_from_now.zip(cron_schedules).map do |day, schedule|
      delayed_job_scope.where(cron: schedule)
                       .where('run_at > ?', Time.zone.now.next_day(day).beginning_of_day)
                       .count
    end
  end
  let(:expected_count) { [1, 1, 1, 1] }

  # rubocop:disable RSpec/BeforeAfterAll
  before(:all) do
    delayed_job_scope.delete_all
  end

  after(:all) do
    delayed_job_scope.delete_all
  end
  # rubocop:enable RSpec/BeforeAfterAll

  it 'queues the reccuring jobs with the defined cron schedules and correct run_at times' do
    # set env variables and trigger the initializers for example with a rake command
    `#{env_vars} bundle exec rake db:version`
    expect(jobs_count_with_correct_run_at).to eq(expected_count)
  end
end
# rubocop:enable RSpec/DescribeClass
