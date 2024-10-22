# frozen_string_literal: true

require 'net/sftp'

module Usecases
  module ReactionProcessEditor
    module SFTP
      class SynchronizeDevices
        HOSTNAME = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICES_SFTP_HOSTNAME')
        USERNAME = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICES_SFTP_USERNAME')
        PASSWORD = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICES_SFTP_PASSWORD')

        LOCAL_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DATA_DIR', 'tmp')
        REMOTE_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DEVICES_SFTP_DIR', '.')

        def self.execute!
          return unless HOSTNAME && USERNAME && PASSWORD

          Net::SFTP.start(HOSTNAME, USERNAME, password: PASSWORD) do |sftp|
            sftp.download!(REMOTE_DIR, Rails.root.join(LOCAL_DIR).to_s, recursive: true)
          end
        end
      end
    end
  end
end
