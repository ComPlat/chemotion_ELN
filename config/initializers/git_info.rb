# frozen_string_literal: true

require 'open3'

module GitInfo
  class << self
    def run
      return {} unless git_available?
      return {} unless in_git_repo?

      info[:describe_tag] = capture('git describe --tags --long --dirty')
      info[:branch] = capture('git describe --all')
      info[:current_revision] = capture('git rev-list --simplify-by-decoration -1 HEAD')
      info[:base_revision] = capture('git merge-base HEAD origin/main').presence ||
                             capture('git merge-base HEAD main')

      log_info
      info
    end

    def info
      @info ||= {
        describe_tag: nil,
        branch: nil,
        current_revision: nil,
        base_revision: nil,
      }
    end

    private

    def git_available?
      system('which git > /dev/null 2>&1')
    end

    def in_git_repo?
      _, _, status = Open3.capture3('git rev-parse --is-inside-work-tree')
      status.success?
    end

    def capture(cmd)
      stdout, stderr, status = Open3.capture3(cmd)
      return stdout.strip if status.success?

      Rails.logger.warn("Failed to run '#{cmd}': #{stderr.strip}")
      nil
    end

    def log_info
      message = <<~INFO
        Git Info:
                      describe --tags: #{info[:describe_tag]}
                       describe --all: #{info[:branch]}
                             rev-list: #{info[:current_revision]}
          merge-base HEAD origin/main: #{info[:base_revision]}
      INFO
      Rails.logger.info(message)
      puts message
    end
  end
end

info = GitInfo.run.compact.stringify_keys
Rails.application.config.version.merge!(info)
