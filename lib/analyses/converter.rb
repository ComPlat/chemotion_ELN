# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'
require 'date'

# rubocop: disable Metrics/AbcSize
# rubocop: disable Metrics/MethodLength
# rubocop: disable Metrics/ClassLength

module Analyses
  class Converter
    def self.uri(api_name)
      url = Rails.configuration.converter.url
      "#{url}#{api_name}"
    end

    def self.timeout
      Rails.configuration.try(:converter).try(:timeout) || 30
    end

    def self.extname
      '.jdx'
    end

    def self.client_id
      Rails.configuration.converter.profile || ''
    end

    def self.secret_key
      Rails.configuration.converter.secret_key || ''
    end

    def self.auth
      { username: client_id, password: secret_key }
    end

    def self.date_time
      DateTime.now.strftime('%Q')
    end

    def self.signature(jbody)
      md5 = Digest::MD5.new
      md5.update jbody
      mdhex = md5.hexdigest
      mdall = mdhex << secret_key
      @signature = Digest::SHA1.hexdigest mdall
    end

    def self.header(opt = {})
      opt || {}
    end

    def self.jcamp_converter(id)
      conf = Rails.configuration.try(:converter).try(:url)
      return unless conf

      response = nil
      oa = Attachment.find(id)
      return if oa.nil?

      folder = Rails.root.join('tmp/uploads/converter')
      FileUtils.mkdir_p(folder)
      ofile = Rails.root.join(folder, oa.filename)
      location_of_attachment = oa.attachment.url

      FileUtils.cp(location_of_attachment, ofile)
      File.open(ofile, 'r') do |f|
        body = { file: f }
        response = HTTParty.post(
          uri('conversions'),
          basic_auth: auth,
          body: body,
          timeout: timeout,
        )
      end
      FileUtils.rm_f(ofile)

      if response.ok?
        tmp_file = Tempfile.new
        tmp_file.write(response.parsed_response)
        name = "#{oa.filename.split('.').first}#{extname}"
        begin
          att = Attachment.new(
            filename: name,
            file_path: tmp_file.path,
            attachable_id: oa.attachable_id,
            attachable_type: 'Container',
            created_by: oa.created_by,
            created_for: oa.created_for,
          )

          att.save!
        ensure
          tmp_file.close
          tmp_file.unlink
        end

      end
      response
    end

    def self.fetch_profiles
      options = { basic_auth: auth, timeout: timeout }
      response = HTTParty.get(uri('profiles'), options)
      response.parsed_response if response.code == 200
    end

    def self.delete_profile(id)
      options = { basic_auth: auth, timeout: timeout }
      response = HTTParty.delete("#{uri('profiles')}/#{id}", options)
      response.parsed_response if response.code == 200
    end

    def self.create_profile(data)
      options = { basic_auth: auth, timeout: timeout, body: data.to_json,
                  headers: { 'Content-Type' => 'application/json' } }
      response = HTTParty.post(uri('profiles'), options)
      response.parsed_response if response.code == 200
    end

    def self.update_profile(data)
      options = { basic_auth: auth, timeout: timeout, body: data.to_json,
                  headers: { 'Content-Type' => 'application/json' } }
      response = HTTParty.put("#{uri('profiles')}/#{data[:id]}", options)
      response.parsed_response if response.code == 200
    end

    def self.create_tables(tmpfile)
      res = {}
      File.open(tmpfile.path, 'r') do |file|
        body = { file: file }
        response = HTTParty.post(
          uri('tables'),
          basic_auth: auth,
          body: body,
          timeout: timeout,
        )
        res = response.parsed_response
      end
      res
    end
  end
end

# rubocop: enable Metrics/AbcSize
# rubocop: enable Metrics/MethodLength
# rubocop: enable Metrics/ClassLength
