namespace :data do
  desc 'Copy research plan thumbnail to public folder'
  task ver_20190508000006_copy_rp_thumbnail_to_pub: :environment do
    list = Attachment.where(attachable_type: 'ResearchPlan')
    thumbpath = 'public/images/thumbnail/'
    FileUtils.mkdir_p(thumbpath) unless Dir.exist?(thumbpath)
    
    list.each do |a|
      if a.read_thumbnail && a.attachable_id
        rp = ResearchPlan.find(a.attachable_id)
        file_path = Rails.public_path.join('images', 'thumbnail', a.identifier)
        rp.update!(thumb_svg: '/images/thumbnail/' + a.identifier) unless rp.nil?
        File.write(file_path, a.read_thumbnail.force_encoding("UTF-8"))
      end
    end
  end
end
