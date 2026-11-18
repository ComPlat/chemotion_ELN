# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::ForkedTimeout do
  describe '.run' do
    it 'returns the block value on success' do
      expect(described_class.run(2) { 40 + 2 }).to eq(42)
    end

    it 'raises TimedOut when the block exceeds the deadline, and reaps the child' do
      # The block runs in the forked child's own memory (copy-on-write), so a plain Ruby
      # variable assigned inside it is invisible to the parent once `run` returns/raises —
      # write the child's real pid to a file instead, which does cross the fork boundary.
      pid_file = Tempfile.new('forked_timeout_pid')
      expect do
        described_class.run(0.2) do
          File.write(pid_file.path, Process.pid.to_s)
          sleep 2
        end
      end.to raise_error(Chemotion::ForkedTimeout::TimedOut)

      child_pid = Integer(File.read(pid_file.path))
      expect { Process.kill(0, child_pid) }.to raise_error(Errno::ESRCH)
    ensure
      pid_file&.close!
    end

    it 're-raises the block\'s own StandardError with the same class and message' do
      expect { described_class.run(2) { raise ArgumentError, 'bad input' } }
        .to raise_error(ArgumentError, 'bad input')
    end

    it 'round-trips a multi-KB string payload across the fork boundary' do
      payload = 'x' * 50_000

      expect(described_class.run(2) { payload }).to eq(payload)
    end

    it 'reaps the child on the success path too (no zombie left behind)' do
      pid_file = Tempfile.new('forked_timeout_pid')
      described_class.run(2) do
        File.write(pid_file.path, Process.pid.to_s)
        1
      end

      child_pid = Integer(File.read(pid_file.path))
      expect { Process.kill(0, child_pid) }.to raise_error(Errno::ESRCH)
    ensure
      pid_file&.close!
    end
  end
end
