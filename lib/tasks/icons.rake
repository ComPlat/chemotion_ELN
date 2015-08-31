namespace :icons do
  task :compile do
    puts "Compiling icons..."
    puts %x(fontcustom compile)
  end
end