class SFTPClientError < StandardError
  attr_reader :error

  def initialize(error, caller, args_of_caller)
    @error = error
    @caller = caller
    @args_of_caller = args_of_caller
  end

  def message
    "Error within SFTPSession: #{@error.message}. Called from #{@caller} with following arguments: #{@args_of_caller.join(', ')}."
  end

  def backtrace
    @error.backtrace
  end
end
