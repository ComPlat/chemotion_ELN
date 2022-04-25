module NodeService
  # Serve ketcher as a service
  module Ketcher
    def self.svg_from_molfile(molfile)
      zmq = ZeroMQ.instance
      svg = zmq.send_and_recv(molfile)

      return Chemotion::OpenBabelService.svg_from_molfile(molfile) if svg.empty?

      processor = Ketcherails::SVGProcessor.new(svg.force_encoding('UTF-8'))
      processor.centered_and_scaled_svg
    end
  end
end
