# frozen_string_literal: true
require 'helpers/thumbnail/thumbnail_creator';
require "base64";
require 'fileutils';

describe ThumbnailCreator do
    context '-> thumbnail' do
        describe '-> create' do
            it '-> successfully' do

            attachmentInfos=createAttachment();
            tempfile=createTmpImage();
            assert(!attachmentInfos[0].thumb);

            creator=ThumbnailCreator.new(ThumbnailerMock.new);
            result=creator.createDerivative(tempfile.path,nil,nil,{},attachmentInfos[0]);

            assert(attachmentInfos[0].thumb);
            expectedPath=File.dirname(tempfile)+"/"+attachmentInfos[1]+".thumb.jpg";
            assert_equal(result[:thumbnail].path,expectedPath);

            end

        end
    end
end

class ThumbnailerMock
    def  createThumbnail(tmpPath)
        return File.open(tmpPath);
    end
end

def createAttachment()
  uuid=SecureRandom.uuid;
        attachment = Attachment.new(
            bucket: 1,
            filename: 'test',
            file_path: 'tmp',
            created_by: 1,
            created_for: 1,
            content_type: 'svg',
            attachable_type: 1,
            attachable_id: 1
        );
    attachment[:identifier]=uuid;
    return[attachment,uuid];
end

def createTmpImage()
 # An image base64 string
    data="iVBORw0KGgoAAAANSUhEUgAAAM4AAAB9CAIAAABlI8tIAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAVGSURBVHhe7d0/iBxlGMfxXf8UNnaXRoIWCaQ6UATB6g5BPDGFFqZwO6OFnU0OomBjooeFTSo9bHKCsbCJ3ImFbpFKhAWrgI0WaSJYaDAQlDjZ95nZuXfnz7t/5jfv7nw/PCTv8t7ezN3+7rmZG+bd/tWdgx6EBtcGNlI5OHfsJR68ddpGvd7ea6/YaGzrx19sdNzu3i0bjV185hMbHTe6/IMbPLHzqRvkPWT/Aw3rXFdr62c6HnQ1rDnrak9dfNI9fv/SY24QlfP9mzZaWAxdrd19oKthzRE1iBA1iBA1iNScFgzf/s9GYW5s3LPR2KP/nrJRari9aaNKRy8d2Whs57sdG1UK+SsDpwWcFmDNETWIEDWIEDWItBy1ux+8U1g2ndr964/CsmmsAroaRIgaRIgaRIgaRBq5WvDb5d/dwwhxtYCrBVhzRA0Tw+3NwrLpVNK9CsumSxA1iBA1iCiilhyHZnXr6N18nb7wQmHt3z+TrxNPXy+s7PPYlhAxutqEd4CSlU2nvAOUrGwaJYhap+1+821I2UenvAvW02UfdxxRi4vXULOy6ZTXULOy6SgRNYjURO3Gxr2Zyp4GTKm5MPXhe3dtNAvvwlRbV0IK5Xcm0NZnD9tobOu56zYqceqnmk1UfEPKzHpfT+CFqUBL+Q7wCxQidLV6jXa1QN4+DL9+1kYlvDXV8uhqEElyM2vZMxdjUUv6kCv3MPPP0ZU5yp4M5NDVIELUIGKnBZn9+2dsNHbhi1dtFOaRK88n/94enXUPnahOC7wvcA6rflrQ1neAqM1s1aPWFn6BtiA7swsve+Yqo6vNbPGutvg+LN7VKl6UsmUDtl7/2UZjs74odDWI1HS12p+ewzsnbTQWf1eLAV0NaBBdraPoali+weEbSdmD9rTW1ehDMi5nBy9/6R46dDWsrVi6WrvHc+1u3WluH1689FXyL10Njdvrn0jKHrSHqEGEqEFEHbWyG6ax9uhqECFqEKmJ2uGdk9VlHwfU8aN2vn8zX3+++dFMdXt01vujWuLg81+ny+bQGfwChYhFbcDCjmgYXQ0iRA0iRA0iRA0iRA2+vcc3CsumU6OplXhd2fQUogYRogYRogYRogYRogbRe7IQNYgQNYjYzXkVt2pp7k6r2IEyDb1rhH7rTtP74O1AfnOBvGXeZl38i64GEaIGEaIGEaLWUfmFdgPLnjmvGE8LAnlf/CJL1La7dafpffB2YH/hlSs5LUCk6GoPdLCr6dHVIEJXe6DLXU320td3teH2ZmHZdCr5vIVl0+i8+q5WZrlXZuhqbZF1tViihrYQtU5r4uWfXkvFUUctNrKvP8TiO1O4enXgO/mvTdT4YwdEJlFL0p1VtqaLK29hmKzyy8Mk5S0Mk1X2eWxLaMPg2sCVPZajq0GEqEGEqEGEqHXF9x+fS2p66Q0ZogYRogYRogYRotYa9+bDkbwFsQBRgwhRgwhRgwhRa8/ffff+wzG8BbEAUYMIUYMIUYMIUUMp7x65rGw6NZq6Tc6VTaeIGkSIGkSIGkSI2orxDpuysumUd9iUlU23YXJznuwmrRAVO1OmuftS9TvT6BYrthVovjv76WoQCYqa16uzsulUvlHny6bRbXQ1iAQdq5VZp8OjCu0eqwUKP37y1kSSHautQNQCeV9/4TIZeRVLZnhkL0ZmLaPGL1CIFHe1QAv+7Fagq9ko2NxdbV+1qjxdDSJEDSJEDSJELUbJgdesZc+MWKSnBYsfqy7xtEB24JxpdIvhr8Jy0dUgMulq+p/dCnQ1G82LrobuoqvVi+o7s6p6vf8B7K798e65yPsAAAAASUVORK5CYII=";
    tempfile = Tempfile.new('example.png');
    File.open(tempfile.path, 'wb') do |f|
        f.write(Base64.decode64(data))
    end

    return tempfile;
end
