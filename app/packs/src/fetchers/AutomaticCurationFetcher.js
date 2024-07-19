import 'whatwg-fetch';

export default class AutomticCurationFetcher {
    static amendFetch(new_word){
        fetch(`http://localhost:3000/api/v1/dictionary/amend?new_word=${new_word}`)
    }
    static removeFetch(old_word){
        fetch(`http://localhost:3000/api/v1/dictionary/remove?old_word=${old_word}`)
    }
    static saveFetch(new_dictionary){
        fetch(`http://localhost:3000/api/v1/dictionary/save?new_dic=${new_dictionary}`)
    }
    static dictionaryFetch(dictionary_lang, dictionary_affix){
        fetch(`/typojs/${dictionary_lang}/${dictionary_affix}`)
        .then ((res)=> res.text())
        .then((text) => {
          return text})
    }

}
