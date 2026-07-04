# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::LlmTaskRegistry do
  # Reset the memoised registry after each test that modifies it
  after { described_class.reload! }

  describe '.all' do
    it 'returns a Hash indexed by task name' do
      result = described_class.all
      expect(result).to be_a(Hash)
      expect(result).not_to be_empty
    end

    it 'indexes tasks by their string name' do
      result = described_class.all
      result.each do |key, task|
        expect(key).to be_a(String)
        expect(task).to be_a(Chemotion::LlmTaskDefinition)
        expect(task.name).to eq(key)
      end
    end

    it 'loads sds_extraction task' do
      task = described_class.all['sds_extraction']
      expect(task).not_to be_nil
      expect(task.display_name).to include('SDS')
      expect(task.category).to eq('extraction')
      expect(task.execution_mode).to eq('async')
      expect(task.json_output?).to be true
      expect(task.validator_class).to eq('LlmTaskValidators::SdsExtractionValidator')
    end

    it 'loads nmr_structuring task' do
      task = described_class.all['nmr_structuring']
      expect(task).not_to be_nil
      expect(task.category).to eq('extraction')
      expect(task.execution_mode).to eq('async')
    end

    it 'loads the committed core task names' do
      # Only sds_extraction and nmr_structuring ship in this feature; further task
      # definitions are added in later commits. `include` tolerates extra tasks.
      expect(described_class.names).to include('sds_extraction', 'nmr_structuring')
    end

    it 'memoises on the second call (same object returned)' do
      first  = described_class.all
      second = described_class.all
      expect(first).to equal(second)
    end
  end

  describe '.find' do
    it 'finds a task by string name' do
      task = described_class.find('sds_extraction')
      expect(task.name).to eq('sds_extraction')
    end

    it 'finds a task by symbol name' do
      task = described_class.find(:sds_extraction)
      expect(task.name).to eq('sds_extraction')
    end

    it 'raises ArgumentError for unknown task name' do
      expect { described_class.find('nonexistent_task') }
        .to raise_error(ArgumentError, /Unknown LLM task/)
    end
  end

  describe '.names' do
    it 'returns a sorted array of task name strings' do
      names = described_class.names
      expect(names).to be_a(Array)
      expect(names).to eq(names.sort)
      expect(names).to all(be_a(String))
    end
  end

  describe '.reload!' do
    it 'clears the memoised registry so the next call re-loads' do
      first = described_class.all
      described_class.reload!
      second = described_class.all
      # Objects will be equal in content but not identical (re-loaded)
      expect(second).not_to equal(first)
      expect(second.keys).to eq(first.keys)
    end
  end

  describe 'YAML content validation for all task definitions' do
    it 'every task has a non-blank name' do
      described_class.all.values.each do |task|
        expect(task.name).not_to be_blank, "Task at #{task.inspect} has blank name"
      end
    end

    it 'every task has a user_template prompt' do
      described_class.all.values.each do |task|
        rendered = task.render_user_prompt(context: 'test context', question: 'test?', structure: 'c1ccccc1')
        expect(rendered).not_to be_blank, "Task '#{task.name}' produced blank user prompt"
      end
    end

    it 'every json-output task has a validator_class that can be constantised' do
      described_class.all.values.select(&:json_output?).each do |task|
        next if task.validator_class.blank?

        expect { task.validator_class.constantize }
          .not_to raise_error,
                  "Task '#{task.name}' references unknown validator class '#{task.validator_class}'"
      end
    end

    it 'every task has a positive timeout_seconds' do
      described_class.all.values.each do |task|
        expect(task.timeout_seconds).to be > 0,
                                        "Task '#{task.name}' has non-positive timeout"
      end
    end
  end
end
