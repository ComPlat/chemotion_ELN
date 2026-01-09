# frozen_string_literal: true

require 'uri'
require 'net/http'
require 'json'

module KetcherService
  # Checks if Ketcher service is disabled
  #
  # @return [Boolean] True if service is disabled, false otherwise
  def self.disabled?
    Rails.configuration.ketcher_service&.disabled? || false
  end

  # Use Ketcher-as-a-Service to render molfiles to SVG
  module RenderSvg
    def self.call_render_service(url, request)
      use_ssl = url.instance_of? URI::HTTPS
      Rails.logger.info("Sending molfile to render service at: #{url} (SSL: #{use_ssl})")
      start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      res = Net::HTTP.start(url.host, url.port, read_timeout: 1.5, use_ssl: use_ssl) do |http|
        http.request(request)
      end
      finish = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      Rails.logger.info("Render service response: #{res.code} in #{finish - start} seconds")
      raise Net::HTTPError.new("Server replied #{res.code}.", res) if res.code != '200'

      svg = JSON.parse(res.body)['svg']
      Rails.logger.info('Render service replied with SVG.')
      svg
    rescue Errno::ECONNREFUSED
      Rails.logger.error('Errno::ECONNREFUSED: ketcher_service unreachable')
      raise
    rescue Errno::ENOENT
      Rails.logger.error('IOError')
      raise
    rescue Net::ReadTimeout
      Rails.logger.error('Timeout.')
      raise
    rescue Net::HTTPError
      Rails.logger.error('HTTP error')
      raise
    rescue JSON::ParserError => e
      Rails.logger.error("Can't parse reply: #{e.message}")
      raise
    end

    def self.svg(molfile)
      url = URI(Rails.configuration.ketcher_service.url)
      request = Net::HTTP::Post.new(url.path, { 'Content-Type' => 'application/json' })
      request.body = { molfile: molfile.force_encoding('utf-8') }.to_json
      svg = RenderSvg.call_render_service(url, request)
      svg.force_encoding('utf-8')
    rescue StandardError
      nil
    end
  end
end


