# frozen_string_literal: true

require_relative 'boot'

require 'rails/all'
require 'dotenv'

require './app/ord_kit/proto/ord_kit_reaction_pb'

Dotenv.load

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups, :plugins)

module Chemotion
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 6.0
    config.autoloader = :classic # classic mode is required because of naming/configuration inconsistencies

    config.version = (File.exist?('VERSION') && YAML.load_file('VERSION')) || {
      'version' => 'v0', 'base_revision' => '0', 'current_revision' => '0'
    }
    config.version['current_revision'] = File.read('REVISION') if File.exist?('REVISION')

    config.action_dispatch.perform_deep_munge = false

    # TODO: Update autoload configuration to current rails standards

    # Grape API config
    config.paths.add File.join('app', 'api'), glob: File.join('**', '*.rb')
    config.autoload_paths += Dir[Rails.root.join('app', 'api', '*')]
    # load lib path
    config.autoload_paths += Dir["#{config.root}/lib/**/"]

    config.autoload_paths += Dir[Rails.root.join('app')]
    config.autoload_paths += Dir[Rails.root.join('lib')]
    config.autoload_paths += Dir[Rails.root.join('helpers')]

    config.active_job.queue_adapter = :delayed_job

    # Get ActiveRecord to look for tables in multiple schemas
    # ( seems to be a problem only on the test runner)
    # config.active_record.schema_format = :sql
    # schema_search_path could be used to set to pg search path to 'public,rdkit'

    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration can go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded after loading
    # the framework and any gems in your application.
    #
    #

    if ENV['SMTP_HOST'].present?
      message = <<~MESSAGE
        #########################################################################
        The use of SMTP_HOST has been deprecated.
        In your .env file, use the variable PUBLIC_URL with a proper uri instead.
        (eg PUBLIC_URL=http://my.eln.edu)
        #########################################################################
      MESSAGE
      puts message
    end

    uri = URI.parse(ENV['PUBLIC_URL'] || 'http://localhost:3000')
    scheme = uri.scheme || 'http'
    host   = uri.host   || 'localhost'
    port   = uri.port
    routes do
      default_url_options(host: host, protocol: scheme, port: port)
    end
    config.root_url = uri&.to_s

    # path of public-asset file for chemspectra data_types
    config.path_spectra_data_type = Rails.public_path.join('data_type.json').to_s.freeze

    # tmp assets fix
    sprite_file = Rails.public_path.join('sprite.png')
    sprite_source = Rails.public_path.join('assets', 'ketcherails', 'sprite*.png')
    new_sprite = Dir.glob(sprite_source).max_by { |f| File.mtime(f) }
    if new_sprite.present?
      FileUtils.rm(sprite_file) if File.file?(sprite_file)
      FileUtils.ln_s(new_sprite, sprite_file)
    end

    # Specifically allow some classes to be serialized by Psych
    # See https://discuss.rubyonrails.org/t/cve-2022-32224-possible-rce-escalation-bug-with-serialized-columns-in-active-record/81017
    # and https://stackoverflow.com/questions/71332602/upgrading-to-ruby-3-1-causes-psychdisallowedclass-exception-when-using-yaml-lo
    config.active_record.yaml_column_permitted_classes = [
      Symbol,
      Hash,
      Array,
      ActiveSupport::HashWithIndifferentAccess,
      Hashie::Array,
      Hashie::Mash,
      Date,

    ]
  end
end
