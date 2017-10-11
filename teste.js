var _               = require('underscore');
var ss              = require('string-similarity');
var google          = require('googleapis');
var customsearch    = google.customsearch('v1');

const CX = '003984500983062713555:72tnk-nf5zo';
const API_KEY = 'AIzaSyBrEDXSfgWHORLFFykl_T9thNXD9691I3s';
const extraParam = ' -"/public/"'
// "augusto benvenuto" -"/public/" -"/groups"
// Remove as Stop Words do nome da pessoa e espaços em branco
var trataRequisicaNome = function(nomeCompleto){
    const stopWords = ["DA", "DAS", "DE", "DES", "DO", "DOS", "E"];
    return nomeCompleto.split(" ").filter(nome => stopWords.indexOf(nome.toUpperCase()) === -1 && nome !== "");
};

var geraListaNomes = function(nomeCompleto){
    var nomes = trataRequisicaNome(nomeCompleto).join(' ').split(" ");
    var lista = [];
    //lista.push('"'+nomeCompleto+'"');
    lista.push(nomeCompleto);
    var primeiroNome = nomes[0];
    nomes.slice(1).forEach(sobrenome => {
        lista.push(primeiroNome + ' ' + sobrenome);
    });

    if(nomes[1] && nomes.length > 2) {
        var segundoNome = nomes[1];
        nomes.slice(2).forEach(sobrenome => {
            lista.push(segundoNome + ' ' + sobrenome);
        });
    }

    console.log('Nomes gerados');
    console.log(lista);
    return lista;
};

var geraPromiseBusca = function(nomeBusca) {
    var resultado = [];
    return new Promise((resolve, reject) => {
        customsearch.cse.list({ cx: CX, q: nomeBusca + extraParam, auth: API_KEY }, function (err, res) {
            if (err) { 
                reject(err); 
            } else {
                //console.log('geraPromiseBusca', nomeBusca);
                //console.log(JSON.stringify(res, null, 2));
                //console.log(err);
                //console.log(JSON.stringify(res, null, 2));
                console.log('***************', nomeBusca + extraParam);
                console.log(res.items);
                
                if (res.items && res.items.length > 0) {
                    resultado = res.items.map(item => {
                        if (! /\/public\//g.test(item.link)){
                            return {
                                //count:  1,
                                title:  item.title.split('| Facebook')[0].trim(),
                                link:   item.link
                            }
                        } else {
                            return null;
                        }
                    }).filter(item => item !== null);
                    resolve(resultado);
                } else {
                    resolve([]);
                }
            }
        });
    });
}

var geraArrayPromisesBusca = function(nomeCompleto) {
    return geraListaNomes(nomeCompleto).map(nome => geraPromiseBusca(nome));
}

var agregaRespostas = function(res) {
    var r = [].concat.apply([], res);

    return r.reduce((acc, item) => {
        if(acc[item.link]){
            acc[item.link].count++;
        } else {
            var tmp = {
                title: item.title,
                link: item.link,
                count: 1
            }
            acc[item.link] = tmp;
        }
        return acc;
    }, {});
}

// Bispo Wanderlucio Chaves
// jose wanderlucio lira

var calculaErro = function(nomeEncontrado, nomeReal, similaridade) {
    var arrayEncontrado = trataRequisicaNome(nomeEncontrado);
    var arrayReal = trataRequisicaNome(nomeReal);

    var countNomeNaoEncontrado = 0;

    for(var _i = 0 ; _i < arrayEncontrado.length; _i++){
        
        var countNaoEncontrado = 0;
        for(var _j = 0 ; _j < arrayReal.length; _j++){
            var valor = ss.compareTwoStrings(arrayEncontrado[_i], arrayReal[_j]);
            console.log('arrayEncontrado[_i], arrayReal[_j]', arrayEncontrado[_i], arrayReal[_j], valor);
            if (valor < 0.75) {
                countNaoEncontrado++;
            }
        }
        if (countNaoEncontrado === arrayReal.length){
            countNomeNaoEncontrado++;
        }
    }

    console.log('nomeEncontrado, nomeReal, similaridade', nomeEncontrado, nomeReal, similaridade);
    console.log('countNomeNaoEncontrado', countNomeNaoEncontrado);
   // console.log('error', Math.pow(1-similaridade, 2) * countNomeNaoEncontrado);

    var exp = (arrayEncontrado.length - countNomeNaoEncontrado <= 2) ? 2 : (arrayEncontrado.length - countNomeNaoEncontrado);
    //console.log('error 2', Math.pow(1-similaridade, exp));
    console.log('error 3', Math.pow(1-similaridade, exp) * countNomeNaoEncontrado);

    return Math.pow(1-similaridade, exp) * countNomeNaoEncontrado;
}

var calculaSimilaridades = function(objRes, nomeCompleto) {
    Object.keys(objRes).forEach(link => {
        var valor = ss.compareTwoStrings(objRes[link].title, nomeCompleto);
        var error = calculaErro(objRes[link].title, nomeCompleto, valor);
        
        //console.log('error', error);

        objRes[link].similaridade   = valor;
        objRes[link].error          = error;
        objRes[link].fit            = objRes[link].count * (valor - error);
    });

    return objRes;
}

var toArray = function(obj) {
    var array = Object.keys(obj).map(link => {
        return obj[link];
    });    
    return _.sortBy(array, item => item.fit);
}

nome = 'jose wanderlucio lira';
//nome = 'jefferson ferreira barbosa';
//nome = 'augusto cesar benvenuto de almeida';
//nome = 'VLADIMIR MICHEL BACURAU MAGALHAES';
//nome = 'SERGIO LUIZ ARAUJO DE FRANCA';
//nome = 'ELIANE SOBRAL BENVENUTO DE ALMEIDA';

Promise.all(geraArrayPromisesBusca(nome))
    .then(res => agregaRespostas(res))
    .then(res => calculaSimilaridades(res, nome))
    .then(res => toArray(res))
    .then(res => {console.log(JSON.stringify(res, null, 2)); return res;})
    .catch(err => console.log('err', err))


// Bispo Wanderlucio Chaves     Jose Wanderlucio Prado
// jose wanderlucio lira

//Benvenuto Alex augusto cesar benvenuto de almeida
//calculaErro('Augusto cesa Benvenuto Alex silva', 'augusto cesar benvenuto de almeida', 0.5);