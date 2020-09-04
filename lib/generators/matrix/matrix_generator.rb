class MatrixGenerator < Rails::Generators::NamedBase
  source_root File.expand_path('../templates', __FILE__)

  class_option :module, type: :string

  def create_matrix_file
    @module_name = file_name.capitalize
    @name = file_name.downcase

    db_dir_path = 'db/migrate'
    Dir.mkdir(db_dir_path) unless File.exist?(db_dir_path)
    db_path = "#{db_dir_path}/#{Time.now.strftime('%Y%m%d%H%M%S')}_matrice_#{@name.underscore}.rb"

    template 'db.erb', db_path
    puts "function name: [#{@module_name.camelize}] created"
  end
end