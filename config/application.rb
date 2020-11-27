require_relative 'boot'

require 'rails/all'
require 'dotenv'

Dotenv.load

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups, :plugins)

module Chemotion
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 5.1
    config.version = File.exist?('VERSION') && YAML.load_file('VERSION') || {
      'version': 'v0', 'base_revision': '0', 'current_revision': '0'
    }
    config.version['current_revision'] = File.read('REVISION') if File.exist?('REVISION')

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
    PLUGS = Bundler.load.current_dependencies.select do |dep|
      dep.groups.include?(:plugins)
    end.map(&:name)

    config.before_configuration do
      # For each registered plugin gem (group :plugins in Gemfile) browserify needs to find
      # an aliasifyConfig.js file (and a package.json file ) in gem root directory.
      # This create a sym link if no file exists.
      node_modules_dir = File.join(Rails.root, 'node_modules')
      PLUGS.each_with_index do |plugin, _|
        plugin_path = File.join(Gem.loaded_specs[plugin].full_gem_path, '.').to_s
        plugin_node_modules = File.join(plugin_path, 'node_modules')
        `rm #{plugin_node_modules}` if File.exist?(plugin_node_modules)
        `ln -s #{node_modules_dir} #{plugin_node_modules}`
        pack_path = Rails.root.join('package.json')
	plugin_pack_path = File.join(plugin_path, 'package.json')
	`rm #{plugin_pack_path}` if File.exist?(plugin_pack_path)
        `ln -s #{pack_path} #{plugin_pack_path}`				
      end

      # Extra module import/export mapping for each registered plugin
      extra_dir = Rails.root.join('app', 'assets', 'javascripts', 'components', 'extra')
      !File.directory?(extra_dir) && FileUtils.mkdir_p(extra_dir)

      module_config_json = JSON.parse(File.read(Rails.root.join('config', 'module_config.json')))
      PLUGS.each_with_index do |plugin, _|
        module_config_file_json = File.join(Gem.loaded_specs[plugin].full_gem_path, 'config', 'module_config.json')
        File.exist?(module_config_file_json) && JSON.parse(File.read(module_config_file_json)).each do |main_comp, extra_comps|
          next unless module_config_json.key?(main_comp) # || module_config.has_key?(main_comp.to_sym)

          extra_comps.presence&.each do |extra_comp, plug_comps|
            if module_config_json[main_comp].key?(extra_comp)
              module_config_json[main_comp][extra_comp][plugin] ||= plug_comps
            end
          end
        end
      end

      module_config_json.each do |jsmodule, hooks|
        hooks.each do |hook, plugins|
          i = 0
          x_imp_exp_file = File.join(extra_dir, jsmodule.to_s.strip + 'X' + hook.to_s.strip + '.js')
          x_import ||= ''
          x_export ||= "export default {\n"
          prototype = plugins['prototype']
          if prototype
            (plugins.keys - ['prototype']).each do |plugin_name|
              plugin_modules = plugins[plugin_name]
              plugin_modules.each do |_, plugin_module|
                prototype.each do |k, default_value|
                  if plugin_module[k]
                    x_import << "import %s%i from 'lib%s/%s';\n" % [k, i, plugin_name.classify, plugin_module[k]]
                    x_export << "  %s%i : %s%i,\n" % [k, i, k, i]
                  else
                    x_export << "  %s%i : %s,\n" % [k, i, default_value]
                  end
                end
                i += 1
              end
            end
          else
            plugins.each do |plugin_name, plugin_modules|
              plugin_modules.each do |_, plugin_module|
                x_import << "import content%i from 'lib%s/%s';\n" % [i, plugin_name.classify, plugin_module['content']]
                x_export << "  content%i : content%i,\n" % [i, i]
                i += 1
              end
            end
          end
          x_export << "  count : %i,\n}" % [i]
          File.write(x_imp_exp_file, x_import + x_export)
        end
      end
    end

    config.browserify_rails.commandline_options = ' -t [ babelify --presets [ @babel/preset-env  @babel/preset-react ] --plugins [ @babel/plugin-proposal-object-rest-spread ] ] '
    # Environments in which to generate source maps
    # The default is none
    config.browserify_rails.source_map_environments << 'development'

    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration should go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded.
  end
end
