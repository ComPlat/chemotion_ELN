# frozen_string_literal: true

describe SampleTask do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:sample) { create(:valid_sample, creator: user) }
  let(:open_sample_task) { create(:sample_task, :open, creator: user, sample: sample) }
  let(:open_free_scan) { create(:sample_task, :open_free_scan, creator: user) }
  let(:done) { create(:sample_task, :done, creator: other_user, sample: sample) }

  before do
    open_sample_task
    open_free_scan
    done
  end

  describe '.for' do
    it 'returns SampleTasks created by the given user' do
      expect(described_class.for(user).ids).to match_array [open_sample_task.id, open_free_scan.id]
    end
  end

  describe '.open' do
    it 'returns all SampleTasks with associated Sample but without measurement data' do
      expect(described_class.open.ids).to eq [open_sample_task.id]
    end
  end

  describe '.open_free_scan' do
    it 'returns all SampleTasks without associated Sample but with measurement data' do
      expect(described_class.open_free_scan.ids).to eq [open_free_scan.id]
    end
  end

  describe '.done' do
    it 'returns all SampleTasks with associated Sample and measurement data' do
      expect(described_class.done.ids).to eq [done.id]
    end
  end

  describe '.without_attachment' do
    it 'returns SampleTasks without attachments' do
      expect(described_class.without_attachment.ids).to eq [open_sample_task.id]
    end
  end

  describe '.with_attachment' do
    it 'returns SampleTasks with attachment' do
      expect(described_class.with_attachment.ids).to match_array [open_free_scan.id, done.id]
    end
  end

  describe '#valid?' do
    let(:sample_task) { described_class.new }

    it 'prevents creating a record that is neither open nor a free scan' do
      expect(sample_task.valid?).to be false
    end

    it 'adds an error with a clear message' do
      sample_task.valid?

      expect(sample_task.errors.added?(:base, :sample_or_scan_data_required)).to be true
    end

    it 'checks the presence of a creator' do
      sample_task.valid?

      expect(sample_task.errors.added?(:creator, :blank)).to be true
    end
  end
end
