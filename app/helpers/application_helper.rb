module ApplicationHelper
  def plugin_list
    Bundler.load.current_dependencies.select{  |dep|  dep.groups.include?(:plugins)}.map(&:name)
  end
end
