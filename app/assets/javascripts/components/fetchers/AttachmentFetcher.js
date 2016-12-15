import 'whatwg-fetch';

export default class AttachmentFetcher {
  static fetchThumbnail(params) {
    let promise = fetch(`/api/v1/attachments/thumbnails?filename=${params.filename}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchThumbnail2(params) {
    let promise = fetch(`/api/v1/attachments/thumbnail/${params.id}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static getFileListfrom(container){
    var allFiles = new Array();
    this.filterAllAttachments(allFiles, container.children);

    return allFiles
  }

  static filterAllAttachments(files, containers){

    containers.forEach( (container) => {
      const fileFromAttachment = function(attachment) {
        let file = attachment.file;
        file.id = attachment.id;
        return file;
      }
      var tmpArray = container.attachments.filter(a => a.is_new).map(a => fileFromAttachment(a));
      files.push.apply(files, tmpArray)

      if(container.children.length > 0){
        this.filterAllAttachments(files, container.children);
      }
    });
  }

  static uploadFiles(files) {
    var data = new FormData()
    files.forEach((file)=> {
      data.append(file.id || file.name, file);
    });
    return ()=>fetch('/api/v1/attachments/upload_dataset_attachments', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => {
      if(response.ok == false) {
        let msg = 'Files uploading failed: ';
        if(response.status == 413) {
          msg += 'File size limit exceeded. Max size is 10MB'
        } else {
          msg += response.statusText;
        }
        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
    })
  }
}
