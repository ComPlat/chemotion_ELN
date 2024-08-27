import 'whatwg-fetch';
import uuid from 'uuid';

var uid = uuid.v4()

export default class AutomticCurationFetcher {
    
    static amendFetch(new_word){
        fetch(`http://localhost:3000/api/v1/dictionary/amend?new_word=${new_word}&junk=${uid}`)
    }
    static removeFetch(old_word){
        fetch(`http://localhost:3000/api/v1/dictionary/remove?old_word=${old_word}&junk=${uid}`)
    }
    static saveFetch(new_dictionary){
        fetch(`http://localhost:3000/api/v1/dictionary/save?new_dic=${new_dictionary}&junk=${uid}`)
    }
    static async dictionaryFetch(dictionary_lang, dictionary_affix){
        const res = await fetch(`/typojs/${dictionary_lang}/${dictionary_affix}`)
        return res.text()
    }

}
