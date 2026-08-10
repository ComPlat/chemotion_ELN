# frozen_string_literal: true

require_relative 'boot'

require 'rails/all'
require 'dotenv'

Dotenv.load

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups, :plugins)

module Chemotion
  class Application < Rails::Application
    # Deploy note: load_defaults (7.0+) sets cookies_serializer=:json and the SHA256 key
    # generator — existing signed/encrypted cookies are invalidated, so a rotator is
    # needed for a zero-downtime rollout. See DEV_RAILS_UPGRADE_7-1.md (Phase D).
    config.load_defaults 7.1
    # (config.autoloader= is deleted since Rails 7.0; Zeitwerk is the only autoloader.)

    # Keep the pre-7.1 default column serializer: our `serialize … type:` columns
    # (reaction/wellplate/screen/molecule/report) rely on the default YAMLColumn, which
    # honors yaml_column_permitted_classes (see below) for safe loading. load_defaults
    # 7.1 sets this to nil, which would raise "missing serializer". See Phase D / C2.
    config.active_record.default_column_serializer = ActiveRecord::Coders::YAMLColumn

    # Keep autoload paths on $LOAD_PATH (load_defaults 7.1 sets this false). The app
    # concern app/models/concerns/encryptor.rb defines a top-level `Encryptor` that
    # collides with the `encryptor` gem's ::Encryptor; with concerns off $LOAD_PATH the
    # gem wins and Device#encrypt_value (from the concern) is undefined. Keeping this
    # true preserves the pre-7.1 resolution. See DEV_RAILS_UPGRADE_7-1.md (Phase D-1).
    config.add_autoload_paths_to_load_path = true

    # Global acronyms for Zeitwerk file->constant mapping (api.rb -> API,
    # sftp_client.rb -> SFTPClient). Defined here, not in inflections.rb, so they
    # apply before autoloading during initialization. 'UI' is deliberately not global
    # (see the per-basename overrides below) so Chemotion::UiAPI stays intact.
    ActiveSupport::Inflector.inflections(:en) do |inflect|
      inflect.acronym 'API'
      inflect.acronym 'SFTP'
    end

    config.version = (File.exist?('VERSION') && YAML.unsafe_load_file('VERSION')) || {
      'version' => 'v0', 'base_revision' => '0', 'current_revision' => '0'
    }
    config.version['current_revision'] = File.read('REVISION') if File.exist?('REVISION')

    config.action_dispatch.perform_deep_munge = false

    # Zeitwerk requires one root per namespace. app/api and lib are each a single root
    # (Rails auto-adds app/*); the previous overlapping roots (app/api/*, app, lib/**/)
    # are removed so nested namespaces resolve conventionally
    # (app/api/chemotion/collection_api.rb -> Chemotion::CollectionAPI).
    config.autoload_paths << Rails.root.join('lib')

    # Excluded from Zeitwerk. Dead/non-conforming legacy (don't map to their path's
    # constant, no live callers — deletion candidates):
    #  * lib/storage — top-level Storage; remotesftp.rb raises on load; only a 2016 rake used it.
    #  * lib/chemotion/chemotion.rb — Chemotion monkey-patch, no callers since 2018.
    #  * lib/chemotion/safety_sheets_reorganizer.rb — standalone manual script.
    # Non-autoloadable lib subdirs (Rails 7.1 ignores these by default):
    #  * lib/tasks — rake tasks + support helpers.
    #  * lib/generators — Rails generators.
    #  * lib/omniauth — ORCID strategy, required explicitly in devise.rb (OmniAuth gem namespace).
    Rails.autoloaders.main.ignore(
      Rails.root.join('lib/storage'),
      Rails.root.join('lib/chemotion/chemotion.rb'),
      Rails.root.join('lib/chemotion/safety_sheets_reorganizer.rb'),
      Rails.root.join('lib/tasks'),
      Rails.root.join('lib/generators'),
      Rails.root.join('lib/omniauth'),
    )
    # lib is autoload-only, not eager-loaded (matches pre-Zeitwerk behaviour).
    # zeitwerk:check over lib passes, so every lib constant resolves.

    # These lib subdirs stay on $LOAD_PATH for bare require / rake_require (the old
    # lib/**/ glob provided it). Zeitwerk is unaffected (loads from the lib root):
    #  * lib/export — labimotion gem does a bare `require 'export_table'`.
    #  * lib/tasks — `rake_require('data/mol_structure')` resolves relative to lib/tasks.
    $LOAD_PATH.unshift(
      Rails.root.join('lib/export').to_s,
      Rails.root.join('lib/tasks').to_s,
    )

    # app/api/helpers and app/api/modules define top-level constants (AttachmentHelpers,
    # LogidzeModule) used bare — collapse so they add no Helpers::/Modules:: namespace.
    Rails.autoloaders.main.collapse(
      Rails.root.join('app/api/helpers'),
      Rails.root.join('app/api/modules'),
    )

    # Per-basename overrides for names that don't follow the global acronyms, so
    # existing constants keep their casing without renaming code:
    Rails.autoloaders.main.inflector.inflect(
      'element_ui_state_scopes' => 'ElementUIStateScopes', # UI acronym (vs UiAPI = word)
      'cell_line_api_params_helpers' => 'CellLineApiParamsHelpers', # Api word (vs API acronym)
      'by_ui_state' => 'ByUIState',
      # "Sftp" word here vs the SFTP acronym elsewhere (SFTPClient):
      'collect_data_from_sftp_job' => 'CollectDataFromSftpJob',
      'collect_file_from_sftp_job' => 'CollectFileFromSftpJob',
      'svg' => 'SVG', # lib/svg dir = SVG:: namespace (Svg-word classes keep default casing)
      'svg_processor' => 'SVGProcessor', # KetcherService::SVGProcessor
      'dc_logger' => 'DCLogger', # DC acronym
    )

    # app/usecases/**/*.rb define Usecases::* constants, but Rails would register
    # app/usecases as a plain root (expecting Reactions::Create, not
    # Usecases::Reactions::Create). Register it as a namespaced root instead, keeping
    # all Usecases::* names. No config sugar for this before Rails 7.1, so intercept
    # before :setup_main_autoloader (the finisher that push_dirs each autoload_path as
    # a plain root, then setups): drop app/usecases from that list and push it
    # namespaced. Rails 7.1+ has push_dir(..., namespace:) — revisit then.
    initializer :usecases_namespaced_root, before: :setup_main_autoloader do
      usecases_dir = Rails.root.join('app/usecases').to_s
      deps = ActiveSupport::Dependencies
      deps.autoload_paths.delete(usecases_dir)
      deps._eager_load_paths.delete(usecases_dir) if deps.respond_to?(:_eager_load_paths)
      Object.const_set(:Usecases, Module.new) unless defined?(::Usecases)
      Rails.autoloaders.main.push_dir(usecases_dir, namespace: ::Usecases)
    end

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

    # OTP secret key used by Devise for encrypting two-factor authentication secrets.
    # In development and test, it falls back to a default value. In production, ensure
    # OTP_SECRET_KEY is set in the environment to keep encryption secure.
    config.otp_secret_encryption_key = ENV.fetch('OTP_SECRET_KEY')

    # OnlyOffice document-server JWT secret, from ENV (off the deprecated
    # Rails.application.secrets). Dev/test: set this ENV when using OnlyOffice locally.
    config.only_office_secret_key_base = ENV['ONLY_OFFICE_SECRET_KEY_BASE']

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
