Thumbnailer.config do |c|
  c.thumbnail_size = 128
  c.cache_path = "#{Rails.root}/tmp/cache/assets/development/thumbnails/"
  c.render_dpi = 90 # PDF render resolution
  c.video_skip_to = 1 # first second
end
