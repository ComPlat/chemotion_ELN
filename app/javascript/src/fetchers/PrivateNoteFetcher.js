import ApiClient from 'src/api_clients/ChemotionApiClient';
import PrivateNote from 'src/models/PrivateNote';
import { classifyString } from 'src/utilities/FetcherHelper';

export default class PrivateNoteFetcher {
  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/private_notes/${id}`);
  }

  static fetchByNoteableId(noteableId, noteableType) {
    const searchTerm = { noteable_id: noteableId, noteable_type: classifyString(noteableType) };
    return ApiClient.getJson(`/api/v1/private_notes?${new URLSearchParams(searchTerm)}`)
      .then((json) => new PrivateNote(json.note));
  }

  static create(params) {
    const body = { ...params };
    if (params.noteable_type) {
      body.noteable_type = classifyString(params.noteable_type);
    }
    return ApiClient.postJson('/api/v1/private_notes', { body })
      .then((json) => new PrivateNote(json.note));
  }

  static update(privateNote) {
    return ApiClient.putJson(`/api/v1/private_notes/${privateNote.id}`, { body: privateNote.serialize() })
      .then((json) => new PrivateNote(json.note));
  }
}
