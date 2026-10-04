# frozen_string_literal: true

module Chemotion
  # Client for the PDF text service (config/sds_text_service.yml), which runs Ghostscript's
  # txtwrite device in a container of its own so an uploaded sheet never reaches gs here.
  class SdsTextService
    DEFAULT_TIMEOUT_SECONDS = 30
    Answer = Struct.new(:text, :error, :truncated, keyword_init: true)

    def self.url
      Rails.configuration.sds_text_service&.url.presence
    end

    def self.configured?
      url.present?
    end

    # Posts a PDF and returns its text layer.
    #
    # Refusals come back as an +error+ that is safe to show in the browser: it never names
    # the service address.
    #
    # @param pdf_path [String] absolute path of the sheet
    # @return [Answer] +text+ (and +truncated+) on success, +error+ otherwise
    def self.read(pdf_path)
      response = HTTParty.post("#{url.chomp('/')}/text",
                               body: File.binread(pdf_path),
                               headers: { 'Content-Type' => 'application/pdf' },
                               timeout: Rails.configuration.sds_text_service.timeout || DEFAULT_TIMEOUT_SECONDS)
      return Answer.new(error: refusal(response)) unless response.code == 200

      Answer.new(text: response.body.to_s, truncated: response.headers['x-truncated'] == '1')
    rescue Net::OpenTimeout, Net::ReadTimeout
      Answer.new(error: 'the PDF text service timed out')
    rescue SocketError, SystemCallError
      Answer.new(error: 'the PDF text service is unavailable')
    end

    def self.refusal(response)
      case response.code
      when 429 then 'the PDF text service is busy, try again shortly'
      when 504 then 'ghostscript timed out'
      when 413 then 'the safety data sheet is too large for the PDF text service'
      when 415 then 'the PDF text service did not accept the file as a PDF'
      when 422 then response.body.to_s.lines.first.to_s.strip.presence || 'ghostscript failed'
      else "the PDF text service answered HTTP #{response.code}"
      end
    end
    private_class_method :refusal
  end
end
