require 'singleton'

module NodeService
  # singleton zqm instance
  class KetcherSvgZeroMQ
    include Singleton

    def initialize
      node_config = Rails.application.config.ketcher_service
      @socket = nil
      @context = nil
      @addr = nil
      return if node_config.nil?

      transport = node_config.transport
      endpoint = node_config.endpoint
      @addr = "#{transport}://#{endpoint}" if @addr.nil?

      @context = ZMQ::Context.new
      @socket = nil
    end

    def error_check(rc)
      if ZMQ::Util.resultcode_ok?(rc)
        false
      else
        STDERR.puts "Operation failed, errno [#{ZMQ::Util.errno}] description [#{ZMQ::Util.error_string}]"
        caller(1).each { |callstack| STDERR.puts(callstack) }
        true
      end
    end

    def send_and_recv(string)
      return '' if @context.nil?

      @socket = @context.socket(ZMQ::REQ)
      @socket.setsockopt(ZMQ::RCVTIMEO, 1000)
      @socket.setsockopt(ZMQ::LINGER, 0)
      @socket.connect(@addr)
      @socket.send_string(string)
      res = ''
      @socket.recv_string(res)
      @socket.close
      res.dup
    rescue => e
      raise 'Can not receive svg info.' + e.message
    end
  end
end
