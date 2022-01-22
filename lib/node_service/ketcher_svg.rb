# frozen_string_literal: true

module NodeService
  # Serve ketcher as a service
  module KetcherSvg
    def self.svg(molfile)
      zmq = KetcherSvgZeroMQ.instance
      svg = zmq.send_and_recv(molfile)
      svg.force_encoding('UTF-8')
    end
  end
end
