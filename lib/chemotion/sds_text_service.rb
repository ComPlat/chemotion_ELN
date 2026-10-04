# frozen_string_literal: true

require 'openssl'
require 'timeout'

module Chemotion
  # Client for the PDF text service (config/sds_text_service.yml), which runs Ghostscript's
  # txtwrite device in a container of its own so an uploaded sheet never reaches gs here.
  class SdsTextService
    Answer = Struct.new(:text, :error, :truncated, :unavailable, :retry_after, keyword_init: true) do
      # Diagnostics for a failure of the service rather than of the sheet; the API answers 503.
      def flags
        { 'service_unavailable' => unavailable, 'retry_after' => retry_after }.compact
      end
    end
    DEFAULT_RETRY_AFTER_SECONDS = 5
    MAX_ERROR_LENGTH = 200
    UNAVAILABLE = 'the PDF text service is unavailable'
    # Failures of the connection itself, as opposed to an answer from the service.
    TRANSPORT_ERRORS = [SocketError, SystemCallError, IOError, Net::HTTPBadResponse,
                        OpenSSL::SSL::SSLError, HTTParty::Error].freeze

    def self.settings
      Rails.configuration.sds_text_service
    end

    # :service, :local, or :misconfigured when a config file is present but unusable.
    def self.mode
      return :misconfigured if settings&.misconfigured
      return :service if settings&.url.present?

      :local
    end

    # Whether the text must come from the service: a misconfigured one still keeps gs out of here.
    def self.configured?
      mode != :local
    end

    # Posts a PDF and returns its text layer.
    #
    # Refusals come back as an +error+ that is safe to show in the browser: it never names
    # the service address. +unavailable+ marks a failure of the service rather than of the sheet.
    #
    # @param pdf_path [String] absolute path of the sheet
    # @return [Answer] +text+ (and +truncated+) on success, +error+ otherwise
    def self.read(pdf_path)
      return Answer.new(error: 'the PDF text service is misconfigured', unavailable: true) if mode == :misconfigured

      # Read before the request, so a local file error is not blamed on the service.
      transfer(File.binread(pdf_path))
    end

    def self.transfer(pdf)
      answer(post(pdf))
    rescue Timeout::Error
      Answer.new(error: 'the PDF text service timed out', unavailable: true)
    rescue *TRANSPORT_ERRORS
      Answer.new(error: UNAVAILABLE, unavailable: true)
    end

    # One deadline for the whole request; HTTParty's timeout applies to each phase separately.
    # The host's proxy settings are for outside services, so this call bypasses them.
    def self.post(pdf)
      Timeout.timeout(settings.timeout) do
        HTTParty.post("#{settings.url.chomp('/')}/text",
                      body: pdf, headers: { 'Content-Type' => 'application/pdf' },
                      timeout: settings.timeout, http_proxyaddr: nil)
      end
    end

    def self.answer(response)
      case response.code
      when 200 then Answer.new(text: response.body.to_s, truncated: response.headers['x-truncated'] == '1')
      when 429 then Answer.new(error: 'the PDF text service is busy, try again shortly', unavailable: true,
                               retry_after: retry_after(response))
      when 502, 503 then Answer.new(error: UNAVAILABLE, unavailable: true)
      else Answer.new(error: refusal(response))
      end
    end

    def self.retry_after(response)
      seconds = Integer(response.headers['retry-after'].to_s, exception: false)
      seconds&.positive? ? seconds : DEFAULT_RETRY_AFTER_SECONDS
    end

    def self.refusal(response)
      case response.code
      when 504 then 'ghostscript timed out'
      when 413 then 'the safety data sheet is too large for the PDF text service'
      when 415 then 'the PDF text service did not accept the file as a PDF'
      when 422 then response.body.to_s.lines.first.to_s.strip[0, MAX_ERROR_LENGTH].presence || 'ghostscript failed'
      else "the PDF text service answered HTTP #{response.code}"
      end
    end
    private_class_method :transfer, :post, :answer, :retry_after, :refusal
  end
end
