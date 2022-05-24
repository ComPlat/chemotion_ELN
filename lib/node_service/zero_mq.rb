require 'singleton'

module NodeService
  # singleton zqm instance
  class ZeroMQ
    include Singleton

    def initialize
      node_config = Rails.application.config.node_service
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

    def send_and_recv(string)
      return '' if @context.nil?

      @socket = @context.socket(ZMQ::REQ)
      @socket.setsockopt(ZMQ::RCVTIMEO, 1000)
      @socket.connect(@addr)
      @socket.send_string(string)

      res = ''
      @socket.recv_string(res)
      @socket.close

      res
    end
  end
end
