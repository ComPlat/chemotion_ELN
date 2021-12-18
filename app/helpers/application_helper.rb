module ApplicationHelper
  def plugin_list
    Bundler.load.current_dependencies.select{  |dep|  dep.groups.include?(:plugins)}.map(&:name)
  end

  def plugin_with_setting_view_list
    plugin_list.select do |plugin|
      !Dir[File.join(Gem.loaded_specs[plugin].full_gem_path,"app","views",plugin,"home","_account.*")].empty?
    end
  end

  def markdown(text)
    options = {
      filter_html: true,
      hard_wrap: true,
      link_attributes: { rel: 'nofollow', target: '_blank' },
      space_after_headers: true,
      fenced_code_blocks: true
    }

    extensions = {
      autolink: true,
      superscript: true,
      disable_indented_code_blocks: true
    }

    renderer = Redcarpet::Render::HTML.new(options)
    @markdown ||= Redcarpet::Markdown.new(renderer, extensions)
    @markdown.render(text).html_safe
  end
end
