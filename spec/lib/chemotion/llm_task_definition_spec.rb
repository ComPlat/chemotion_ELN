# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::LlmTaskDefinition do
  # Build a minimal valid config hash
  let(:base_config) do
    {
      'name'    => 'test_task',
      'prompts' => {
        'system'        => 'You are a test assistant.',
        'user_template' => 'Answer this: {{context}}',
      },
    }
  end

  describe '#initialize' do
    it 'loads name and defaults' do
      task = described_class.new(base_config)
      expect(task.name).to eq('test_task')
      expect(task.display_name).to eq('Test task')
      expect(task.category).to eq('general')
      expect(task.execution_mode).to eq('inline')
      expect(task.output_format).to eq('json')
      expect(task.temperature).to eq(0.1)
      expect(task.timeout_seconds).to eq(120)
      expect(task.max_tokens).to be_nil
      expect(task.validator_class).to be_nil
    end

    it 'accepts all explicit fields' do
      config = base_config.merge(
        'display_name'    => 'Custom Name',
        'category'        => 'extraction',
        'execution_mode'  => 'async',
        'output_format'   => 'text',
        'temperature'     => 0.5,
        'max_tokens'      => 2048,
        'timeout_seconds' => 60,
        'validator_class' => 'LlmTaskValidators::SdsExtractionValidator',
      )
      task = described_class.new(config)
      expect(task.display_name).to eq('Custom Name')
      expect(task.category).to eq('extraction')
      expect(task.execution_mode).to eq('async')
      expect(task.output_format).to eq('text')
      expect(task.temperature).to eq(0.5)
      expect(task.max_tokens).to eq(2048)
      expect(task.timeout_seconds).to eq(60)
      expect(task.validator_class).to eq('LlmTaskValidators::SdsExtractionValidator')
    end

    context 'when config is invalid' do
      it 'raises ArgumentError when name is missing' do
        config = { 'prompts' => { 'user_template' => 'x' } }
        expect { described_class.new(config) }.to raise_error(ArgumentError, /missing required key: 'name'/)
      end

      it 'raises ArgumentError when prompts is missing' do
        config = { 'name' => 'test' }
        expect { described_class.new(config) }.to raise_error(ArgumentError, /missing required key: 'prompts'/)
      end

      it 'raises ArgumentError when user_template is absent from prompts' do
        config = { 'name' => 'test', 'prompts' => { 'system' => 'hi' } }
        expect { described_class.new(config) }.to raise_error(ArgumentError, /user_template/)
      end

      it 'raises ArgumentError when name is blank' do
        config = { 'name' => '  ', 'prompts' => { 'user_template' => 'x' } }
        expect { described_class.new(config) }.to raise_error(ArgumentError, /must not be blank/)
      end

      it 'raises ArgumentError when prompts is not a Hash' do
        config = { 'name' => 'test', 'prompts' => 'bad' }
        expect { described_class.new(config) }.to raise_error(ArgumentError, /must be a Hash/)
      end
    end
  end

  describe '#system_prompt' do
    it 'returns the system prompt string' do
      task = described_class.new(base_config)
      expect(task.system_prompt).to eq('You are a test assistant.')
    end

    it 'returns empty string when no system prompt defined' do
      config = base_config.merge('prompts' => { 'user_template' => 'test' })
      task   = described_class.new(config)
      expect(task.system_prompt).to eq('')
    end
  end

  describe '#render_user_prompt' do
    it 'substitutes {{context}} with the provided value' do
      task   = described_class.new(base_config)
      result = task.render_user_prompt(context: 'What is water?')
      expect(result).to eq('Answer this: What is water?')
    end

    it 'substitutes multiple placeholders' do
      config = base_config.merge(
        'prompts' => {
          'user_template' => "Context: {{context}}\nQuestion: {{question}}",
        },
      )
      task   = described_class.new(config)
      result = task.render_user_prompt(context: 'reaction data', question: 'What yield?')
      expect(result).to eq("Context: reaction data\nQuestion: What yield?")
    end

    it 'removes unreplaced placeholders' do
      config = base_config.merge(
        'prompts' => {
          'user_template' => 'Data: {{context}} Extra: {{unknown}}',
        },
      )
      task   = described_class.new(config)
      result = task.render_user_prompt(context: 'test')
      expect(result).to eq('Data: test Extra:')
    end
  end

  describe '#json_output?' do
    it 'returns true when output_format is json' do
      task = described_class.new(base_config.merge('output_format' => 'json'))
      expect(task.json_output?).to be true
    end

    it 'returns false when output_format is text' do
      task = described_class.new(base_config.merge('output_format' => 'text'))
      expect(task.json_output?).to be false
    end

    it 'defaults to true (json)' do
      task = described_class.new(base_config)
      expect(task.json_output?).to be true
    end
  end

  describe '#async?' do
    it 'returns true for async execution mode' do
      task = described_class.new(base_config.merge('execution_mode' => 'async'))
      expect(task.async?).to be true
    end

    it 'returns false for inline execution mode' do
      task = described_class.new(base_config.merge('execution_mode' => 'inline'))
      expect(task.async?).to be false
    end
  end

  describe '#to_h' do
    it 'returns a hash with metadata keys (no prompts)' do
      task = described_class.new(base_config)
      h    = task.to_h
      expect(h).to include(:name, :display_name, :description, :category, :execution_mode, :output_format)
      expect(h).not_to have_key(:prompts)
      expect(h).not_to have_key(:system_prompt)
    end
  end
end
