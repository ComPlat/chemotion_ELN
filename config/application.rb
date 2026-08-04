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
    # Framework-default settings. Aligned to 6.1 to match the running Rails 6.1
    # gem (was 6.0 — a 6.0/6.1 mismatch). This is Phase 0b of the Rails 7.0 upgrade
    # (DEV_RAILS_UPGRADE_7-0.md §0b): adopt the 6.1-era defaults on the 6.1 gem so
    # the later 7.0 jump starts from a clean 6.1 baseline. Next step towards 7.0 is
    # `load_defaults 7.0` (Phase 2), flipped flag-by-flag.
    config.load_defaults 6.1
    # load_defaults 6.1 already sets the autoloader to :zeitwerk; kept explicit for
    # clarity. NB: the `config.autoloader=` setter is DELETED in Rails 7.0 (guide
    # §6.5) — remove this line at the 7.0 gem bump (Phase 1).
    config.autoloader = :zeitwerk

    # Global acronyms so Zeitwerk (which delegates to ActiveSupport::Inflector)
    # maps file names to the existing constant names — API and SFTP are used
    # uppercase consistently across the codebase (api.rb -> API,
    # collection_api.rb -> Chemotion::CollectionAPI, sftp_client.rb -> SFTPClient).
    # Defined in the application body (not config/initializers/inflections.rb) per
    # the Rails 6.1->7.0 guide §6.7, so they apply before any autoloading during
    # initialization. 'UI' is deliberately NOT global (see the per-basename
    # Zeitwerk override below — keeps Chemotion::UiAPI intact).
    ActiveSupport::Inflector.inflections(:en) do |inflect|
      inflect.acronym 'API'
      inflect.acronym 'SFTP'
    end

    config.version = (File.exist?('VERSION') && YAML.unsafe_load_file('VERSION')) || {
      'version' => 'v0', 'base_revision' => '0', 'current_revision' => '0'
    }
    config.version['current_revision'] = File.read('REVISION') if File.exist?('REVISION')

    config.action_dispatch.perform_deep_munge = false

    # Zeitwerk autoloading (Rails 7 prep — DEV_RAILS_UPGRADE_7-0.md §0a):
    # app/api is a SINGLE autoload root (Rails auto-adds app/*), so its nested
    # namespaces resolve conventionally, e.g.
    #   app/api/api.rb                         -> API           (inflections.rb acronym)
    #   app/api/chemotion/collection_api.rb    -> Chemotion::CollectionAPI
    #   app/api/helpers/attachment_helpers.rb  -> Helpers::AttachmentHelpers
    # lib/ is a single autoload root. The previous overlapping/nested roots
    # (app/api/*, app itself, lib/**/) are removed — Zeitwerk requires one root
    # per namespace.
    config.autoload_paths << Rails.root.join('lib')

    # Dead / non-conforming legacy files excluded from Zeitwerk (they don't map to
    # their path's constant and have no live callers, so they'd only ever break
    # eager loading). Candidates for outright deletion later. DEV_RAILS_UPGRADE_7-0.md §0a:
    #  * lib/storage/* — storage.rb -> top-level Storage (not Storage::Storage);
    #    remotesftp.rb would even raise on load (`class RemoteSFTP < storage`).
    #    Only a 2016 data-version rake referenced it.
    #  * lib/chemotion/chemotion.rb — reopens `module Chemotion` to add one class
    #    method (molecule_info_from_molfile) with ZERO callers since 2018; maps to
    #    Chemotion::Chemotion, which it doesn't define.
    #  * lib/chemotion/safety_sheets_reorganizer.rb — a standalone, manually-run
    #    maintenance script (interactive prompts) defining a top-level constant;
    #    not referenced by the app.
    # Also excluded (standard non-autoloadable lib subdirs — Rails 7.1 ignores
    # these by default via config.autoload_lib):
    #  * lib/tasks — rake tasks + their support/*.rb helpers (loaded by the tasks).
    #  * lib/generators — Rails generators (found by the generator system).
    #  * lib/omniauth — the ORCID strategy is explicitly `require`d in
    #    config/initializers/devise.rb and extends the OmniAuth gem namespace
    #    (OmniAuth::Strategies::ChemotionOrcid), not an app constant.
    Rails.autoloaders.main.ignore(
      Rails.root.join('lib/storage'),
      Rails.root.join('lib/chemotion/chemotion.rb'),
      Rails.root.join('lib/chemotion/safety_sheets_reorganizer.rb'),
      Rails.root.join('lib/tasks'),
      Rails.root.join('lib/generators'),
      Rails.root.join('lib/omniauth'),
    )
    # NB: lib is autoload-only (not eager-loaded), matching the pre-Zeitwerk
    # behaviour. It was TEMPORARILY added to eager_load_paths during the migration
    # to run `zeitwerk:check` over it — that pass was GREEN ("All is good!"), so
    # every lib constant resolves correctly. It can be moved to eager_load_paths
    # later for boot-time verification if desired. DEV_RAILS_UPGRADE_7-0.md §0a.

    # A few lib subdirs must stay on $LOAD_PATH — the old `lib/**/` autoload_paths
    # glob used to put every lib subdir there, and some bare `require` / rake
    # `rake_require` calls still depend on it. Zeitwerk is unaffected (it autoloads
    # from the lib root; same absolute paths dedupe via $LOADED_FEATURES):
    #  * lib/export — the labimotion gem does a bare `require 'export_table'`
    #    (labimotion/libs/export_element.rb) expecting lib/export on $LOAD_PATH.
    #  * lib/tasks — `Rake.application.rake_require('data/mol_structure')` and
    #    similar resolve rake files "relative to lib/tasks" via $LOAD_PATH.
    $LOAD_PATH.unshift(
      Rails.root.join('lib/export').to_s,
      Rails.root.join('lib/tasks').to_s,
    )

    # app/api/helpers/*.rb and app/api/modules/*.rb define TOP-LEVEL constants
    # (e.g. AttachmentHelpers, LogidzeModule) and are used bare (helpers X /
    # include X). Collapse these dirs so they don't add a Helpers::/Modules::
    # namespace — keeps all existing code unchanged.
    Rails.autoloaders.main.collapse(
      Rails.root.join('app/api/helpers'),
      Rails.root.join('app/api/modules'),
    )

    # Naming outliers that don't follow the global acronyms above, mapped per
    # basename for Zeitwerk (so we preserve the existing constant names rather
    # than rename code):
    #   * ElementUIStateScopes uses the "UI" acronym while the rest of the app
    #     treats "Ui" as a word (Chemotion::UiAPI) — a global UI acronym would
    #     break UiAPI, so map just this basename.
    #   * CellLineApiParamsHelpers treats "Api" as a word, unlike the global API
    #     acronym used by every *API class — map it back so it isn't expected as
    #     CellLineAPIParamsHelpers.
    Rails.autoloaders.main.inflector.inflect(
      'element_ui_state_scopes' => 'ElementUIStateScopes',
      'cell_line_api_params_helpers' => 'CellLineApiParamsHelpers',
      'by_ui_state' => 'ByUIState',
      # These two jobs spell it "Sftp" (word) while the rest of the app uses the
      # SFTP acronym (SFTPClient) — map them back so the global acronym doesn't
      # force CollectData*FromSFTPJob.
      'collect_data_from_sftp_job' => 'CollectDataFromSftpJob',
      'collect_file_from_sftp_job' => 'CollectFileFromSftpJob',
      # The lib/svg dir is the SVG:: namespace (app uses SVG::Processor,
      # SVG::ReactionComposer, … consistently). Only the dir basename is mapped —
      # the "Svg"-as-a-word classes in lib/chemotion (SvgSanitizer, SvgRenderer)
      # keep their default casing since their basenames differ.
      'svg' => 'SVG',
      # KetcherService::SVGProcessor (SVG acronym). Only this exact basename — the
      # lib/chemotion "*_svg_processor" files keep the Svg-word casing.
      'svg_processor' => 'SVGProcessor',
      # Datacollector::DCLogger uses the DC acronym.
      'dc_logger' => 'DCLogger',
    )

    # app/usecases/**/*.rb define constants under a `Usecases::` namespace
    # (e.g. app/usecases/reactions/create.rb -> Usecases::Reactions::Create), but
    # Rails would otherwise register app/usecases as a *plain* autoload root
    # (making it expect Reactions::Create, without the Usecases prefix). Register
    # it as a NAMESPACED root under Usecases instead — this preserves all existing
    # Usecases::* constant names (64 files, ~119 call sites) unchanged.
    #
    # Rails 6.1 has no config sugar for namespaced roots, so we intercept just
    # before :let_zeitwerk_take_over (finisher): it push_dir's every
    # Dependencies.autoload_paths entry as a plain root and then locks the loader
    # with setup. We remove app/usecases from that list and push it namespaced
    # ourselves. Rails 7.1+ supports `push_dir(..., namespace:)` natively — revisit
    # then. (DEV_RAILS_UPGRADE_7-0.md §0a)
    initializer :usecases_namespaced_root, before: :let_zeitwerk_take_over do
      usecases_dir = Rails.root.join('app/usecases').to_s
      deps = ActiveSupport::Dependencies
      deps.autoload_paths.delete(usecases_dir)
      deps._eager_load_paths.delete(usecases_dir)
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

    # OnlyOffice document-server JWT secret. Sourced from ENV (production already
    # read ENV['ONLY_OFFICE_SECRET_KEY_BASE'] via config/secrets.yml). Moved here off
    # the deprecated Rails.application.secrets (7.1 deprecated / 7.2 removed) —
    # DEV_RAILS_UPGRADE_7-0.md §0c. Dev/test: set this ENV (was hardcoded in
    # secrets.yml) when running the OnlyOffice integration locally.
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
