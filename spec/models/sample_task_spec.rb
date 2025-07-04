# frozen_string_literal: true

# == Schema Information
#
# Table name: sample_tasks
#
#  id                    :bigint           not null, primary key
#  description           :string
#  required_scan_results :integer          default(1), not null
#  result_unit           :string           default("g"), not null
#  result_value          :float
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#  creator_id            :bigint           not null
#  sample_id             :bigint
#
# Indexes
#
#  index_sample_tasks_on_creator_id  (creator_id)
#  index_sample_tasks_on_sample_id   (sample_id)
#
# Foreign Keys
#
#  fk_rails_...  (creator_id => users.id)
#  fk_rails_...  (sample_id => samples.id)
#
describe SampleTask do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:open_without_scan_results) { create(:sample_task_without_scan_results, creator: user) }
  let(:open_with_incomplete_scan_results) { create(:sample_task_with_incomplete_scan_results, creator: user) }
  let(:open_with_only_missing_sample) { create(:sample_task_with_only_missing_sample, creator: user) }
  let(:done) { create(:sample_task_finished, creator: other_user) }

  before do
    open_without_scan_results
    open_with_incomplete_scan_results
    open_with_only_missing_sample
    done
  end

  describe '.for' do
    it 'returns SampleTasks created by the given user' do
      expect(described_class.for(user).ids).to contain_exactly(
        open_without_scan_results.id,
        open_with_incomplete_scan_results.id,
        open_with_only_missing_sample.id,
      )
    end
  end

  describe '.open' do
    it 'returns all SampleTasks without result data' do
      expect(described_class.open.ids).to contain_exactly(
        open_without_scan_results.id,
        open_with_incomplete_scan_results.id,
        open_with_only_missing_sample.id,
      )
    end
  end

  describe '.done' do
    it 'returns all SampleTasks with associated Sample and measurement data' do
      expect(described_class.done.ids).to eq [done.id]
    end
  end

  describe '.with_sample' do
    it 'returns all sample tasks that have a sample assigned' do
      expect(described_class.done.ids).to eq [done.id]
    end
  end

  describe '.without_sample' do
    it 'returns all sample_tasks that have no sample assigned' do
      expect(described_class.without_sample.ids).to contain_exactly(
        open_without_scan_results.id,
        open_with_incomplete_scan_results.id,
        open_with_only_missing_sample.id,
      )
    end
  end

  describe '.with_result_data' do
    it 'returns all sample_tasks where result_value is not nil' do
      expect(described_class.done.ids).to eq [done.id]
    end
  end

  describe '.without_result_data' do
    it 'returns all sample_tasks where result_value is nil' do
      expect(described_class.without_result_data.ids).to contain_exactly(
        open_without_scan_results.id,
        open_with_incomplete_scan_results.id,
        open_with_only_missing_sample.id,
      )
    end
  end

  describe '.with_missing_scan_results' do
    it 'returns all sample tasks that have less scan results than required' do
      expect(described_class.with_missing_scan_results.ids).to contain_exactly(
        open_without_scan_results.id,
        open_with_incomplete_scan_results.id,
      )
    end
  end

  describe '#valid?' do
    let(:sample_task) { described_class.new }

    it 'prevents creating a record that is neither open nor a free scan' do
      expect(sample_task.valid?).to be false
    end

    it 'checks the presence of a creator' do
      sample_task.valid?

      expect(sample_task.errors.added?(:creator, :blank)).to be true
    end
  end
end
