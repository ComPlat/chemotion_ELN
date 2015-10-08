class Report::Image
  def initialize
    @size = {x: 0, y: 0}
  end

  def set_path path
    File.open(path, "rb") {|io| svg = io.read }
  end

  def set_blob blob
    @svg = blob
  end

  def size hash = nil
    if hash.nil?
      @size
    else
      @size[:x] = hash[:x] unless hash[:x].nil?
      @size[:y] = hash[:y] unless hash[:y].nil?
    end
  end

  def obtain_png_file
    blob = obtain_png_blob

    file = Tempfile.new('image')
    file.binmode
    file.write blob
    file.flush
    file.close

    return file.path
  end

  private

  def obtain_png_blob
    unless @svg.nil?
      # Das Umwandlungsprozess könnte auch andere Bibilotheke benutzen, es ist hier unabhängig
      image = Magick::Image.from_blob(@svg) { self.format = 'SVG'; }.first
      image.format = 'png'
      image.to_blob
    else
      raise "Fehler: Kein Bild angegeben"
    end
  end
end
