# frozen_string_literal: true

def delayed_job_scope
  Delayed::Job.where.not(cron: nil)
end

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'queuing of a recurring job through delayed_job initializer' do
  # env variable name that can be used to define the cron schedules
  # NB: CRON_CONFIG_PC_LCSS is intentionally absent — there is one PubChem job now, scheduled
  # by CRON_CONFIG_PC_CID, and its sweep does both the cid and the LCSS halves.
  let(:env_var_names) do
    %w[
      CRON_CONFIG_PC_CID
      CRON_CONFIG_REFRESH_ELEMENT_TAG
      CRON_CONFIG_DISK_USAGE
    ]
  end
  let(:days_from_now) { [2, 3, 4] }
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
  let(:expected_count) { [1, 1, 1] }

  # rubocop:disable RSpec/BeforeAfterAll
  before(:all) do
    delayed_job_scope.delete_all
  end

  after(:all) do
    delayed_job_scope.delete_all
  end
  # rubocop:enable RSpec/BeforeAfterAll

  it 'queues the recurring jobs with the defined cron schedules and correct run_at times' do
    # set env variables and trigger the initializers for example with a rake command
    `#{env_vars} bundle exec rake db:version`
    expect(jobs_count_with_correct_run_at).to eq(expected_count)
  end

  it 'schedules PubchemLookupJob from CRON_CONFIG_PC_CID' do
    `#{env_vars} bundle exec rake db:version`

    expect(delayed_job_scope.where("handler like '%PubchemLookupJob%'")).to be_present
  end

  # The two folded-in classes keep disabled entries only so their stale recurring rows are
  # cleaned up by the destroy step rather than continuing to fire on the old schedule.
  it 'leaves no recurring entry for either folded-in job' do
    lcss_schedule = '5 5 * * 1'
    `#{env_vars} CRON_CONFIG_PC_LCSS='#{lcss_schedule}' bundle exec rake db:version`

    expect(delayed_job_scope.where("handler like '%PubchemLcssJob%'")).to be_none
    expect(delayed_job_scope.where("handler like '%PubchemCidJob%'")).to be_none
  end

  # PubchemCidJob and PubchemLcssJob were folded into PubchemLookupJob and their classes deleted.
  # Rows naming them can never run again — deserialization would raise NameError and the row
  # would burn through max_attempts into failed_jobs — so the initializer drops them outright
  # rather than keeping shim classes alive just to name them. Both recurring and one-off rows go:
  # every one of these was an idempotent sweep whose work is derived from a pending scope, not
  # carried in the queue row.
  #
  # The rows are made in before(:all) on purpose: the assertions below shell out to a separate
  # rake process, which runs on its own connection and cannot see anything still inside this
  # example's transaction.
  context 'with queued rows for job classes that no longer exist' do
    # before(:all) commits, which is the whole point here, and that forces instance variables:
    # a `let` would be rolled back with each example's transaction and stay invisible to rake.
    # rubocop:disable RSpec/BeforeAfterAll, RSpec/InstanceVariable
    before(:all) do
      @obsolete_recurring = create_locked_delayed_job('PubchemCidJob')
      @obsolete_recurring.update!(cron: '5 5 * * 1')
      @obsolete_one_off = create_locked_delayed_job('PubchemLcssJob')
      @obsolete_renamed = create_locked_delayed_job('PubchemSingleLcssJob')
      @surviving = create_locked_delayed_job('PubchemLookupJob')
    end

    after(:all) do
      ids = [@obsolete_recurring, @obsolete_one_off, @obsolete_renamed, @surviving].compact.map(&:id)
      Delayed::Job.where(id: ids).delete_all
    end

    it 'destroys them, recurring and one-off alike, and leaves the surviving class alone', :aggregate_failures do
      `#{env_vars} bundle exec rake db:version`

      expect(Delayed::Job.find_by(id: @obsolete_recurring.id)).to be_nil
      expect(Delayed::Job.find_by(id: @obsolete_one_off.id)).to be_nil
      expect(Delayed::Job.find_by(id: @obsolete_renamed.id)).to be_nil
      expect(Delayed::Job.find_by(id: @surviving.id)).to be_present
    end
    # rubocop:enable RSpec/BeforeAfterAll, RSpec/InstanceVariable
  end

  # A rotation continuation self-enqueued via `self.class.set(wait: ...).perform_later(...)`
  # (see PubchemLookupJob#continue_after) never sets `cron:`, unlike the recurring entry
  # InitCronJobsJob creates — it must survive the initializer's cleanup, which is why the
  # destroy step is scoped `.where.not(cron: nil)`.
  #
  # PubchemLookupJob, not one of the folded-in classes: those are in OBSOLETE_JOB_CLASSES and
  # are destroyed one-off rows included, so using one here would assert the opposite of what
  # the initializer does. And before(:all), not a `let`/inline create, for the same reason as
  # the context above — the rake subprocess runs on its own connection and cannot see a row
  # still inside an example's uncommitted transaction, so an uncommitted row would "survive"
  # no matter what the initializer did.
  # rubocop:disable RSpec/BeforeAfterAll, RSpec/InstanceVariable
  context 'with an in-flight one-off continuation for a managed class' do
    before(:all) do
      @one_off = create_locked_delayed_job('PubchemLookupJob')
    end

    after(:all) do
      @one_off&.destroy
    end

    it 'does not destroy it on boot (cron: nil)' do
      `#{env_vars} bundle exec rake db:version`

      expect(Delayed::Job.find_by(id: @one_off.id)).to be_present
    end
  end
  # rubocop:enable RSpec/BeforeAfterAll, RSpec/InstanceVariable
end
# rubocop:enable RSpec/DescribeClass
