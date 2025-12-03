Thumbnailer.config do |c|
  c.thumbnail_size = 800
  # c.cache_path = "#{Rails.root}/uploads/thumbnails/"
  c.render_dpi = 200 # PDF render resolution
  c.video_skip_to = 1 # first second
end
