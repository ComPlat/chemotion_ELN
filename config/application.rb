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
require 'dotenv'

Dotenv.load

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups,:plugins)


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

    # config.active_job.queue_adapter = :delayed_job


    # Chemotion Plugin configuration

    # list of registered plugins (from the plugins group of the Gemfile):
    PLUGS = Bundler.load.current_dependencies.select{  |dep|  dep.groups.include?(:plugins)}.map(&:name)

    config.before_configuration do

      #For each registered plugin gem (group :plugins in Gemfile) browserify needs to find
      #an aliasifyConfig.js file (and a package.json file ) in gem root directory.
      #This create a sym link if no file exists.
      node_modules_dir = File.join(Rails.root, 'node_modules')
      PLUGS.each_with_index do |plugin,i|
        plugin_path = File.join(Gem.loaded_specs[plugin].full_gem_path,".").to_s
#        `ln -s #{aliasify_file} #{plugin_path}` # unless File.exist?(File.join(plugin_path,"aliasifyConfig.js"))
        `ln -s #{node_modules_dir} #{plugin_path}` # unless File.exist?(File.join(plugin_path,"node_modules"))
      end

   # Extra module import/export mapping for each registered plugin
      module_config =YAML.load(File.read(File.join(Rails.root,"config","module_config.yml")))
      PLUGS.each_with_index do |plugin,i|
        module_config_file = File.join(Gem.loaded_specs[plugin].full_gem_path,"config","module_config.yml")
        YAML.load(File.read(module_config_file)).each do |main_comp, extra_comps|
          if module_config.has_key?(main_comp) #|| module_config.has_key?(main_comp.to_sym)
            extra_comps.each do |extra_comp, plug_comps|
              if module_config[main_comp].has_key?(extra_comp)
                module_config[main_comp][extra_comp][plugin]||=plug_comps
              end
            end if extra_comps
          end
        end if File.exists?(module_config_file)
      end
      extra_dir = File.join(Rails.root,"app","assets","javascripts","components","extra")
      !File.directory?(extra_dir) && FileUtils.mkdir_p(extra_dir)

      module_config.each do |main_comp, extra_comps|
        extra_comps.each do |extra_comp, plugins|
          i = 0
          x_imp_exp_file = File.join(extra_dir,main_comp.to_s.strip+"X"+extra_comp.to_s.strip+".js")
          x_import||=""
          x_export||= "export default {\n"

          plugins.each do |plugin, plug_comps|
            plug_comps.each do |plug_comp|
              x_import<<" import %s%i from 'lib%s/%s';\n" %[extra_comp,i,plugin.classify,plug_comp]
              x_export<<"  %s%i : %s%i,\n" %[extra_comp,i,extra_comp,i]
              i+=1
            end
          end
          x_export << "  %sCount : %i,\n}" %[extra_comp,i]
          File.write(x_imp_exp_file,x_import+x_export)
        end
      end

    end # of config.before_configuration

    config.browserify_rails.commandline_options = "-t [ babelify --presets [ es2015 react ] --plugins [ transform-object-rest-spread ] ] "# -t aliasify "

    # Environments in which to generate source maps
    # The default is none
    config.browserify_rails.source_map_environments << "development"


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
