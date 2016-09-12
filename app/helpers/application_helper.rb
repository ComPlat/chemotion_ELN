module ApplicationHelper
  def plugin_list
    Bundler.load.current_dependencies.select{  |dep|  dep.groups.include?(:plugins)}.map(&:name)
  end

  def plugin_with_setting_view_list
    plugin_list.select do |plugin|
      !Dir[File.join(Gem.loaded_specs[plugin].full_gem_path,"app","views",plugin,"home","_account.*")].empty?
    end
  end
end
