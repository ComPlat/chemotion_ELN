require File.expand_path('../boot', __FILE__)

# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"
require "sprockets/railtie"
require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Chemotion
  class Application < Rails::Application
    config.action_dispatch.perform_deep_munge = false
    # Grape API config
    config.paths.add File.join('app', 'api'), glob: File.join('**', '*.rb')
    config.autoload_paths += Dir[Rails.root.join('app', 'api', '*')]
    # load lib path
    config.autoload_paths += Dir["#{config.root}/lib/**/"]

    config.autoload_paths += Dir[Rails.root.join('app')]
    config.autoload_paths += Dir[Rails.root.join('lib')]

    config.active_job.queue_adapter = :delayed_job


    # Chemotion Plugin configuration

    # list of registered plugins (from the plugins group of the Gemfile):
    PLUGS = Bundler.load.current_dependencies.select{  |dep|  dep.groups.include?(:plugins)}.map(&:name)

    # browserify: aliasifyConfig.js generation
    # Aliasify is used to enable the import/export of modules from chemotion (app/asset or node_modules) to
    # the plugin gems (and inversely).
    # When browserify browses through the plugins files, "chemotion/node_modules" is
    # not in the path (but plugin/node_modules is ). The aliases avoid the duplication of module installation.
    # Normaly, modules at the top of myplugin/app/assets/javascripts are in the Node_path
    # and can be imported directly (see
    # https://github.com/browserify-rails/browserify-rails#support-for-rails-asset-directories-as-non-relative-module-sources )
    # As this is debated matter, aliasify also ensure here the paths are correct.

    config.before_configuration do
      plugin_aliases,plugin_replacements="",""
      PLUGS.each_with_index do |plugin,i|
        plugin_path = File.join(Gem.loaded_specs[plugin].full_gem_path,"app","assets","javascripts",plugin).to_s
        #plugin_replacements << %(    "_plugin#{i.to_s}/((\\/|\\\\w)+)": "#{plugin_path}/$1",\n)
        plugin_aliases << %(    "#{plugin}":"#{plugin_path}",\n)
      end
      aliasify_config = %(module.exports = {
      "aliases": {
      #{plugin_aliases}
      },
      "replacements": {
      "_components/((\\/|\\\\w)+)":  "#{Rails.root}"+"/app/assets/javascripts/components/$1",
      "_node_modules/((\\/|\\\\w)+)":  "#{Rails.root}"+"/node_modules/$1",
      #{plugin_replacements}
      },
      verbose: true
      };
      )
      aliasify_file = File.join(Rails.root, 'aliasifyConfig.js')
      File.write(aliasify_file,aliasify_config)

      #For each registered plugin gem (group :plugins in Gemfile) browserify needs to find
      #an aliasifyConfig.js file (and a package.json file ) in gem root directory.
      #This create a sym link if no file exists.
      PLUGS.each_with_index do |plugin,i|
        plugin_path = File.join(Gem.loaded_specs[plugin].full_gem_path,".").to_s
        `ln -s #{aliasify_file} #{plugin_path}` # unless File.exists?(aliasify_file)
      end
    end
    config.browserify_rails.commandline_options = "-t babelify -t aliasify "

    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration should go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded.

    # Set Time.zone default to the specified zone and make Active Record auto-convert to this zone.
    # Run "rake -D time" for a list of tasks for finding time zone names. Default is UTC.
    # config.time_zone = 'Central Time (US & Canada)'

    # The default locale is :en and all translations from config/locales/*.rb,yml are auto loaded.
    # config.i18n.load_path += Dir[Rails.root.join('my', 'locales', '*.{rb,yml}').to_s]
    # config.i18n.default_locale = :de
  end
end
