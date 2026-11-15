// ═══════════════════════════ O Mar da Tempestade: Creta ═══════════════════════════
// Região de São Paulo Apóstolo (dom do Conselho; o vício é a Ira). Primeira parte: Bons Portos, na costa sul de
// Creta, perto da cidade de Laseia (At 27,8), onde o navio de Alexandria espera o tempo firmar. Depois vêm o navio
// na tempestade, o naufrágio e Malta.
//
// Aqui só se prepara a viagem: a tripulação impaciente, o dono do navio com pressa, Júlio sereno. Paulo ainda está
// na casa, rezando; o aviso dele (At 27,10) e a partida ficam para a fase seguinte.

// ─── A viagem desde a Bahia ───

=== bahia_saveiro ===
{ primeira("bahia_saveiro_creta"):
    espirito: Este saveiro pode levar você mais longe do que a baía. Muito mais longe. #plano:geral
    espirito: Há um mar onde um homem preso atravessou a tempestade e não perdeu a calma. Um apóstolo, levado a Roma em correntes.
    espirito: Lá, a Ira levanta as ondas. Ali se aprende o dom do Conselho: saber o que fazer quando todos perdem a cabeça.
}
* [Navegar até Creta.]
    ~ evento("viajar_creta")
* [Voltar à Cidade Dourada.]
    ~ evento("viajar_cidade")
* [Ficar na Bahia.]
- -> END

=== creta_chegada ===
placa: Creta, costa sul: Bons Portos, perto da cidade de Laseia. (At 27,8)
espirito: Um porto pequeno, numa enseada aberta. O navio grande no cais veio de Alexandria e leva trigo para Roma. #plano:geral
espirito: Entre os passageiros há presos sob a guarda de um centurião. Um deles é Paulo, o apóstolo.
espirito: A viagem até aqui foi lenta, com vento contrário. E a estação boa de navegar já passou: depois do Jejum, o mar fica traiçoeiro.
espirito: Converse com a gente do porto. A leste, pela estrada das colinas, fica Laseia. E o mar, você pode atravessar a nado.
-> END

=== creta_barco_volta ===
pescador: Quer voltar? Um barco de pesca não vai longe... mas o Espírito leva onde o vento não leva.
* [Voltar à Bahia.]
    ~ evento("viajar_bahia")
* [Ficar em Creta.]
- -> END

// ─── O cais e o navio ───

=== creta_julio ===
{ primeira("creta_julio_conheceu"): -> conhecer }
{ shuffle:
- julio: O vento ainda não mudou. Quando mudar, partimos. #gesto:explicar
- julio: Paulo está na casa da praia com os dois companheiros. Não vai fugir. Nem sei se quer. #gesto:sim
- julio: Os marinheiros estão de mau humor. Gente parada num porto ruim azeda depressa. #gesto:triste
}
-> END

= conhecer
julio: Você não é da tripulação. Também vai para Roma? #plano:geral
julio: Sou Júlio, centurião da coorte Augusta. Levo estes presos a César. #gesto:explicar
* [Paulo também é seu preso?]
    julio: É. Um cidadão romano que apelou a César. Em Sídon deixei que fosse ver os amigos. Não me arrependi. #gesto:sim
* [O senhor parece tranquilo.]
    julio: Um soldado que se exalta no porto não presta na batalha. Aqui todos gritam. Alguém precisa não gritar. #gesto:sim
- julio: O dono do navio quer partir. O piloto também. Querem passar o inverno num porto melhor, mais a oeste.
julio: Eu decido com eles. Eles entendem de mar; eu, de homens.
-> END

=== creta_soldado ===
{ shuffle:
- soldado: Os presos não saem da vista. Ordem do centurião. #gesto:nao
- soldado: Se um preso foge, quem paga é o guarda. Com a vida. #gesto:triste
- soldado: Este porto não serve para invernar. Todo mundo diz. E todo mundo quer ir embora.
}
-> END

=== creta_nauclero ===
{ primeira("creta_nauclero_conheceu"): -> conhecer }
{ shuffle:
- nauclero: Fênix. Assim que soprar vento sul, vamos para Fênix. #gesto:explicar
- nauclero: Ainda aqui? Se não vai ajudar, não atrapalhe. #gesto:nao
}
-> END

= conhecer
nauclero: O navio é meu, e o trigo é de Roma. Cada dia parado aqui é dinheiro jogado ao mar. #gesto:nao #plano:geral
nauclero: Este porto é aberto ao vento. No inverno, as ondas entram até o cais. Não fico aqui nem morto.
* [E se o tempo virar?]
    nauclero: O tempo, o tempo! Todo mundo agora é piloto! #gesto:nao
    nauclero: Fênix fica a poucas horas daqui. Um porto de verdade, protegido. Chegamos lá antes de qualquer tempestade.
* [O senhor parece cansado.]
    nauclero: Cansado? Estou farto. Da costa, do vento contrário, dos presos comendo do meu trigo. #gesto:nao
- espirito: Repare na voz dele. A pressa virou raiva, e a raiva fala alto. #pausa:0.4
-> END

=== creta_piloto ===
{ primeira("creta_piloto_conheceu"): -> conhecer }
{ shuffle:
- piloto: Olhe as nuvens sobre as montanhas. Enquanto estiverem paradas, ficamos. #gesto:ceu
- piloto: Fênix tem dois braços de mar, um para o sudoeste e outro para o noroeste. Bom abrigo. #gesto:explicar
}
-> END

= conhecer
piloto: Cuidado com os cabos. #plano:geral
piloto: Eu cuido do leme. Os dois remos de governo, ali na popa: um navio deste tamanho se guia com eles.
* [É perigoso partir agora?]
    piloto: Navegar já é perigoso. Ficar aqui o inverno inteiro, num porto aberto, também é. #gesto:explicar
    piloto: Se vier um vento sul brando, contornamos o cabo e chegamos a Fênix. É só um trecho de costa.
* [Que vento é esse que todos temem?]
    piloto: O que desce das montanhas da ilha. Os marinheiros chamam de Euraquilão. #gesto:explicar
    piloto: Quando ele vem, não se discute com ele. Corre-se com ele, e reza-se.
- piloto: Mas o centurião decide. E o dono quer partir.
-> END

=== creta_marinheiro ===
{ shuffle:
- marinheiro: Mais um dia de cordas molhadas e nada de vento bom. #gesto:nao
- marinheiro: Duzentas e tantas almas num casco só, e cada uma reclamando de alguma coisa. #gesto:triste
- marinheiro: Se o dono gritar comigo mais uma vez, eu juro que... deixa para lá. #gesto:nao
- marinheiro: Diz que o preso da casa da praia fala com o Deus dele como quem fala com um amigo. Estranho.
- marinheiro: Fênix. Fênix. Só se ouve isso. Eu queria era chegar em casa.
}
-> END

=== creta_preso ===
{ shuffle:
- preso: Para Roma. Lá, ou soltam a gente, ou nunca mais se ouve falar. #gesto:triste
- preso: O tal Paulo reparte o pão dele com a gente. Nunca vi preso fazer isso. #gesto:sim
- preso: Não tenho nada a perder. Por isso tenho medo de tudo. #gesto:triste
}
-> END

// ─── Os companheiros de Paulo ───

=== creta_lucas ===
{ primeira("creta_lucas_conheceu"): -> conhecer }
{ shuffle:
- lucas: Saímos de Mira num navio de Alexandria. A navegação tem sido lenta: o vento não nos deixa ir aonde queremos. #gesto:explicar
- lucas: Paulo ainda reza. Espere um pouco. #gesto:sim
- lucas: Escrevo devagar. A pressa estraga a tinta e as histórias.
}
-> END

= conhecer
lucas: A paz esteja com você. Sou Lucas, médico. Viajo com Paulo. #gesto:inclinar #plano:geral
lucas: Anoto o caminho: os portos, os ventos, os dias. Um dia alguém vai querer saber como a Palavra chegou a Roma.
* [Onde está Paulo?]
    lucas: Lá dentro, rezando. Ele ora muito antes de falar, e mais ainda antes de calar. #gesto:sim
    lucas: Logo você o conhece. Ele gosta de gente que pergunta.
* [O senhor é médico num navio de presos?]
    lucas: Onde há presos, há doentes. E onde há gente com medo, um médico serve de mais coisas que remédio. #gesto:explicar
- lucas: Fique por perto. Quando o navio partir, vamos precisar de gente serena a bordo.
-> END

=== creta_aristarco ===
{ primeira("creta_aristarco_conheceu"): -> conhecer }
{ shuffle:
- aristarco: Os marinheiros andam com os nervos à flor da pele. Uma palavra torta e começa a briga. #gesto:triste
- aristarco: Paulo pediu silêncio por um tempo. Nós dois guardamos a porta. #gesto:sim
}
-> END

= conhecer
aristarco: Sou Aristarco, de Tessalônica, na Macedônia. Estou com Paulo desde Éfeso. #gesto:inclinar #plano:geral
aristarco: Em Éfeso, a multidão me arrastou para o teatro, gritando sem nem saber por quê. Aprendi o que é a fúria de muitos.
* [E o senhor teve medo?]
    aristarco: Tive. Mas a fúria passa depressa quando ninguém a alimenta. #gesto:sim
* [Por que acompanhar um preso?]
    aristarco: Porque um amigo não se deixa sozinho na estrada. Nem quando a estrada é uma corrente. #gesto:sim
- espirito: Repare: quem já viu a ira de perto não tem pressa de devolvê-la.
-> END

=== creta_casa_paulo ===
espirito: Lá dentro, um homem reza em voz baixa. É Paulo. #plano:geral
espirito: Ainda não é hora de interromper. Volte quando o navio estiver para partir.
-> END

// ─── A gente de Bons Portos ───

=== creta_pescador ===
{ primeira("creta_pescador_conheceu"): -> conhecer }
{ shuffle:
- pescador: As redes secam, o mar descansa. Devia ser assim com a gente também. #gesto:sim
- pescador: A ilhota ali na frente? Dá para ir a nado, se você tiver fôlego. #gesto:explicar
- pescador: Quer voltar ao seu mar? O barco no fim da praia, depois das casas, leva quem precisa. #gesto:explicar
}
-> END

= conhecer
pescador: Pesco nesta enseada desde menino. Conheço cada pedra do fundo. #plano:geral
pescador: Esse pessoal do navio grande acha que sabe mais do mar que quem vive nele. #gesto:nao
pescador: Quando as nuvens descem das montanhas de lado, vem o vento nordeste. E com ele não tem conversa.
* [Então eles não deviam partir?]
    pescador: Eu não partiria. Mas eu sou só um velho com um barco de remo. Quem escuta velho? #gesto:triste
* [O senhor já pegou esse vento no mar?]
    pescador: Uma vez. Fiquei três dias agarrado ao barco, e prometi a mim mesmo nunca mais brigar com o mar. #gesto:sim
- pescador: O mar não tem raiva de ninguém. A gente é que tem raiva dele.
-> END

=== creta_padeira ===
{ shuffle:
- padeira: Pão para duzentas e tantas bocas! Esse navio vai acabar com o meu trigo. #gesto:explicar
- padeira: O dono do navio grita com todo mundo. Mas o pão ele não paga gritando, paga com moeda. #gesto:nao
- padeira: O homem da casa da praia veio agradecer o pão. Pessoalmente. Ninguém faz isso. #gesto:sim
- padeira: Fogo forte demais queima o pão por fora e deixa cru por dentro. Gente também é assim.
}
-> END

=== creta_pastor ===
{ primeira("creta_pastor_conheceu"): -> conhecer }
{ shuffle:
- pastor: As cabras não brigam com o vento. Viram as costas e esperam passar. #gesto:sim
- pastor: A estrada para Laseia passa por estas colinas. Siga as pedras. #gesto:explicar
}
-> END

= conhecer
pastor: Daqui de cima se vê o porto inteiro, e o mar até onde o olho alcança. #plano:geral
pastor: As cabras sentem o tempo antes de mim. Hoje estão inquietas. #gesto:explicar
* [O que isso quer dizer?]
    pastor: Que alguém lá embaixo devia esperar. Mas quem sobe até aqui para perguntar a um pastor? #gesto:triste
* [E o senhor, sente o tempo?]
    pastor: Sinto a montanha. Quando ela fica quieta demais, é que vai soprar. #gesto:ceu
- -> END

// ─── Laseia ───

=== creta_laseia_guarda ===
{ primeira("creta_laseia_entrou"): -> conhecer }
{ shuffle:
- laseiano: A porta fecha ao pôr do sol. Até lá, a praça é sua. #gesto:explicar
- laseiano: Cuidado com a beira da falésia, além da muralha. É alto. #gesto:explicar
}
-> END

= conhecer
laseiano: Bem-vindo a Laseia. Gente do navio? Então veio comprar, não brigar, espero. #plano:geral
laseiano: Ontem dois marinheiros quebraram uma ânfora na praça, discutindo por nada. #gesto:nao
-> END

=== creta_laseia_mercador ===
{ shuffle:
- laseiano: Azeite, vinho, mel de tomilho! O melhor da ilha. #gesto:explicar
- laseiano: Os do navio compram pouco e reclamam muito. Mas compram. #gesto:sim
- laseiano: Dizem que o dono do navio quer chegar a Fênix. Bom porto. Mas não nesta estação. #gesto:nao
}
-> END

=== creta_laseia_fonte ===
{ shuffle:
- laseiana: A água desta fonte vem da montanha. Fria até no verão. #gesto:explicar
- laseiana: Meu marido é pescador em Bons Portos. Ele diz que este ano o vento veio cedo. #gesto:triste
- laseiana: Discussão na praça de novo hoje cedo. Os homens do navio andam com o sangue quente. #gesto:nao
}
-> END

=== creta_laseia_velho ===
{ primeira("creta_laseia_velho_conheceu"): -> conhecer }
{ shuffle:
- laseiano: A ira é um vento que sopra de dentro. Passa logo, mas deixa o barco virado. #gesto:triste
- laseiano: Volte quando quiser. O pórtico não sai daqui, e eu também não. #gesto:sim
}
-> END

= conhecer
laseiano: Sente-se aqui na sombra do pórtico. Na minha idade, a gente só fala e escuta. #plano:geral
laseiano: Já vi muitos navios saírem desta costa com pressa. Nem todos voltaram.
* [Por que os homens têm tanta pressa?]
    laseiano: Porque esperar dói. E quem não sabe esperar, se zanga com o tempo, com os outros, consigo. #gesto:explicar
* [O senhor daria um conselho a eles?]
    laseiano: Dar, eu dou. O difícil é quem receba. Conselho é semente: só pega em terra mansa. #gesto:sim
- espirito: Guarde isso. O Conselho não grita. Fala baixo, e precisa de silêncio para ser ouvido.
-> END
