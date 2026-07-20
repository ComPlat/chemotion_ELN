# frozen_string_literal: true

require 'io/wait'

module Chemotion
  # Runs a block in a forked child process with a wall-clock deadline, so a blocking
  # native/C-extension call that Ruby's Timeout.timeout cannot interrupt (it never yields
  # back to the VM) can still be bounded: the child is SIGKILLed on overrun instead of
  # hanging the caller forever.
  module ForkedTimeout
    class TimedOut < StandardError; end

    # @param seconds [Numeric] wall-clock deadline
    # @yield block whose return value must be Marshal-dumpable; must not touch
    #   ActiveRecord or any other shared resource — the child inherits the parent's
    #   file descriptors (including the DB socket), and since the child is unconditionally
    #   killed rather than shut down cleanly, any state it wrote to a shared resource
    #   would be left inconsistent for the parent.
    # @return [Object] the block's return value
    # @raise [TimedOut] if the deadline is exceeded (child is killed with SIGKILL) or the
    #   child produced no output (e.g. it crashed/segfaulted before writing a result)
    # @raise [StandardError] re-raises whatever the block itself raised
    def self.run(seconds, &block)
      # binmode: Marshal payloads are arbitrary bytes, not text -- without it IO.pipe's
      # default external encoding can raise Encoding::UndefinedConversionError (or silently
      # corrupt data) on a non-UTF-8-valid byte sequence crossing the pipe.
      reader, writer = IO.pipe(binmode: true)
      pid = spawn_child(writer, &block)
      writer.close

      read_result(reader, pid, seconds)
    ensure
      reader&.close
    end

    def self.spawn_child(writer)
      fork do
        writer.write(Marshal.dump([:ok, yield]))
      rescue StandardError => e
        writer.write(Marshal.dump([:error, e.class.name, e.message]))
      ensure
        writer.close
        # skip at_exit hooks (Rails/RSpec/etc.) and any further shared-fd activity;
        # this child is being discarded either way, success or timeout.
        Process.exit!(true) # rubocop:disable Rails/Exit
      end
    end
    private_class_method :spawn_child

    def self.read_result(reader, pid, seconds)
      unless reader.wait_readable(seconds)
        Process.kill('KILL', pid)
        Process.wait(pid)
        raise TimedOut, "block exceeded #{seconds}s"
      end

      data = reader.read
      Process.wait(pid)
      raise TimedOut, 'child produced no output (crashed before writing a result)' if data.blank?

      unmarshal(data)
    end
    private_class_method :read_result

    def self.unmarshal(data)
      # Trusted: `data` only ever comes from the child process we just forked ourselves above.
      status, *rest = Marshal.load(data) # rubocop:disable Security/MarshalLoad
      return rest.first if status == :ok

      klass_name, message = rest
      klass = klass_name.safe_constantize
      raise(klass && klass <= StandardError ? klass.new(message) : StandardError.new("#{klass_name}: #{message}"))
    end
    private_class_method :unmarshal
  end
end
