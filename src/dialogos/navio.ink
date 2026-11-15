// ═══════════════════════════ O Mar da Tempestade: o navio ═══════════════════════════
// Segunda parte da região de São Paulo: a viagem de Creta até a noite antes do naufrágio (At 27,14-38).
// O Euraquilão, o bote içado, o casco cintado, a carga ao mar, os dias sem sol nem estrelas, o anjo que Paulo viu,
// a sonda e as âncoras, a fuga dos marinheiros e o pão partido. O naufrágio e a Ira ficam para a parte seguinte.
//
// A Ira cresce aos poucos: o medo vira raiva, e a raiva briga. O dom do Conselho é a palavra certa no tom certo.
// As falas de Atos vêm com a referência; o resto é fala de personagem.

=== navio_inicio ===
espirito: O vento sul soprava brando, e eles foram costeando Creta bem de perto (At 27,13). #plano:geral
espirito: Pouco depois, desceu da ilha um vento tempestuoso, o chamado Euraquilão (At 27,14). #pausa:0.6
espirito: O navio foi arrastado e não pôde resistir ao vento. Então se deixaram levar (At 27,15).
{ tem("creta_conselho_ira"):
    espirito: Lembra do cais? A raiva que se acendeu lá veio a bordo também. Fique atento a ela.
- else:
    { tem("creta_conselho_calado"):
        espirito: No cais você calou. Aqui, vão precisar da sua voz. E das suas mãos.
    - else:
        espirito: No cais você falou com mansidão. Aqui, vão precisar disso mais ainda.
    }
}
marinheiro: O bote! O bote vai se encher de água! Alguém na popa, puxem o cabo!
espirito: O bote vem a reboque atrás da popa. Ajude a puxá-lo para bordo. E quando uma onda vier, fique junto ao mastro.
-> END

=== navio_bote ===
marinheiro: Todos juntos! Agora! #plano:geral
marinheiro: De novo! Puxa!
espirito: Passando ao abrigo de uma ilhota chamada Cauda, com dificuldade conseguiram recolher o bote (At 27,16).
~ evento("bote")
marinheiro: Agora os cabos! Se o casco abrir, vamos todos para o fundo!
espirito: Os marinheiros passam cabos por baixo do casco, para cingir o navio (At 27,17). Ajude nos três pontos da borda.
-> END

=== navio_cintado ===
marinheiro: Esticado! Esse casco aguenta mais um pouco. #plano:geral
espirito: Com medo de encalhar nos bancos de areia da Sirte, baixaram o aparelho e se deixaram levar (At 27,17).
espirito: No dia seguinte, como a tempestade os castigava com violência, começaram a lançar a carga ao mar (At 27,18). #pausa:0.6
nauclero: O meu trigo! Cada saco é uma fortuna! #gesto:nao
piloto: Ou o trigo, ou o navio. Escolha. #gesto:explicar
espirito: Leve a carga da pilha, junto à escotilha, até a borda, e lance ao mar.
-> END

=== navio_carga_feita ===
espirito: No terceiro dia, com as próprias mãos, lançaram ao mar o aparelho do navio (At 27,19). #plano:geral
espirito: Nem o sol nem as estrelas apareceram por muitos dias, e a tempestade não era pequena: acabou-se toda a esperança de salvação (At 27,20). #pausa:0.8
espirito: Repare nos homens. O medo, quando dura muito, apodrece em raiva. Há brigas no convés.
espirito: É a Ira que sobe com as ondas. Separe os que brigam. Mas cuidado: ira não se apaga com ira.
-> END

// ─── As brigas (a Ira) ───

=== navio_briga_1 ===
marinheiro: Você bebeu a minha parte da água! Eu vi! #gesto:nao #plano:geral
marinheiro: Mentira! Diz isso de novo e você vai pro mar! #gesto:nao
* [Pôr-se entre os dois e falar baixo.]
    espirito: Você se põe entre eles e pede: a água é de todos; ninguém aqui é inimigo, o inimigo é o mar.
    marinheiro: ... #gesto:triste
    marinheiro: Desculpa. Faz dias que eu não durmo. #gesto:triste
    espirito: Viu? Quem fala baixo obriga o outro a baixar a voz para escutar.
    ~ marcar("navio_briga_1")
    ~ evento("briga")
* [Gritar mais alto que os dois.]
    espirito: Você grita mais alto que eles. Por um instante se calam... e então os dois se voltam contra você.
    marinheiro: E quem é você para mandar em mim?! #gesto:nao
    espirito: Fogo não apaga fogo. Tente de novo, de outro jeito.
    ~ marcar("navio_gritou")
- -> END

=== navio_briga_2 ===
marinheiro: A culpa é do dono! Ele quis partir! Ele e o dinheiro dele! #gesto:nao #plano:geral
marinheiro: E você concordou, covarde! Todo mundo concordou! #gesto:nao
* [Lembrar que agora todos estão no mesmo barco.]
    espirito: Você lembra a eles: procurar culpado não tira água do porão. Agora o que importa é chegar vivo, juntos.
    marinheiro: É... gritar não tira água do porão. #gesto:sim
    marinheiro: Vamos para a bomba. Os dois. #gesto:sim
    ~ marcar("navio_briga_2")
    ~ evento("briga")
* [Dar razão a um e acusar o outro.]
    espirito: Você toma partido. O outro se sente cercado e a briga dobra de tamanho.
    marinheiro: Agora são dois contra um, é?! #gesto:nao
    espirito: O conselho não escolhe um lado para vencer. Procura o que une os dois. Tente de novo.
    ~ marcar("navio_gritou")
- -> END

=== navio_briga_3 ===
marinheiro: É culpa daquele preso, o tal Paulo! Agourou a viagem lá em Creta! #gesto:nao #plano:geral
marinheiro: Joga ele no mar e o mar se acalma! #gesto:nao
* [Lembrar que Paulo foi o único que avisou.]
    espirito: Você lembra: ele não trouxe a tempestade. Foi o único que viu a tempestade vindo, e ninguém escutou.
    marinheiro: ... Ele avisou mesmo. Eu estava lá. #gesto:triste
    marinheiro: Quem quer jogar alguém no mar é o medo. Não sou eu. #gesto:triste
    ~ marcar("navio_briga_3")
    ~ evento("briga")
* [Ameaçar os dois.]
    espirito: Você ameaça. Eles recuam um passo, mas o ódio só muda de alvo.
    marinheiro: Então joga você também! #gesto:nao
    espirito: Medo com medo vira pânico. Tente de novo.
    ~ marcar("navio_gritou")
- -> END

// ─── O anjo (At 27,21-26) ───

=== navio_anjo ===
espirito: Fazia muito tempo que ninguém comia. Então Paulo se levantou no meio deles. #plano:geral
paulo: Senhores, devíeis ter-me ouvido e não ter partido de Creta; teríeis evitado este dano e este prejuízo. #gesto:explicar
paulo: Mas agora eu vos exorto a ter coragem, pois nenhuma vida se perderá entre vós; só o navio. #gesto:acolher #plano:perto
paulo: Esta noite me apareceu um anjo do Deus a quem pertenço e a quem sirvo, e me disse: #gesto:ceu
paulo: "Não temas, Paulo. É preciso que compareças diante de César, e Deus te concedeu todos os que navegam contigo." #gesto:rezar
paulo: Por isso, senhores, tende coragem. Confio em Deus que acontecerá assim como me foi dito. #gesto:peito
paulo: Mas é preciso que encalhemos numa ilha. #gesto:explicar
espirito: São as palavras de Paulo como Lucas as guardou (At 27,21-26). #plano:geral
espirito: Repare: ele lembrou o aviso, mas não para humilhar ninguém. Disse a verdade para levantar, não para derrubar. Isso é o Conselho.
~ evento("anjo")
espirito: Os dias passaram. Chegou a décima quarta noite, e eles iam à deriva pelo mar Adriático (At 27,27). #pausa:1
marinheiro: Ouviram? É arrebentação! Tem terra perto! #gesto:surpresa
espirito: Vá à proa e ajude a lançar a sonda.
-> END

// ─── A sonda e as âncoras (At 27,27-29) ───

=== navio_sonda_1 ===
marinheiro: Sonda ao mar! #plano:geral
marinheiro: Vinte braças! (At 27,28)
~ marcar("navio_sonda_1")
espirito: Lance de novo, um pouco mais adiante.
-> END

=== navio_sonda ===
marinheiro: Quinze braças! O fundo está subindo! #gesto:surpresa #plano:geral
piloto: Rochedos. Se batermos de noite, não sobra ninguém. Âncoras da popa! Quatro! #gesto:explicar
espirito: Temendo bater contra os rochedos, lançaram quatro âncoras da popa, e esperavam ansiosos pelo dia (At 27,29).
~ evento("sonda")
espirito: As âncoras estão na popa, atrás da cabine.
-> END

=== navio_ancoras_feitas ===
espirito: As quatro âncoras seguram o navio. Agora é esperar o dia. E rezar. #plano:geral
-> END

=== navio_fuga_vista ===
espirito: Olhe para a proa. #plano:geral
espirito: Os marinheiros procuravam fugir do navio: baixaram o bote ao mar, fingindo que iam lançar âncoras da proa (At 27,30).
espirito: Querem se salvar sozinhos e deixar os outros à própria sorte. Corra até Paulo.
-> END

// ─── Paulo a bordo ───

=== navio_paulo ===
{
- tem("navio_pao"): -> depois
- tem("navio_fuga"): -> conforto
- tem("navio_ancoras"): -> fuga
- tem("navio_anjo"): -> coragem
- else: -> rezando
}

= rezando
{ shuffle:
- paulo: Rezo por eles. Pelos que trabalham e pelos que brigam. Vá ajudar: as mãos também rezam. #gesto:rezar
- paulo: Não tenha vergonha do medo. Tenha cuidado com o que o medo faz com a gente. #gesto:explicar
- paulo: Segure-se quando a onda vier. Deus quer você inteiro. #gesto:acolher
}
-> END

= coragem
{ shuffle:
- paulo: Coragem. Ele prometeu, e Ele cumpre. #gesto:sim
- paulo: Nenhum de vós se perderá. Nem você. #gesto:acolher
}
-> END

= fuga
paulo: Eu vi. Júlio! #gesto:explicar #plano:geral
paulo: Se estes não ficarem no navio, vós não podereis salvar-vos. #gesto:nao
espirito: São as palavras de Paulo ao centurião e aos soldados (At 27,31).
julio: Soldados! As cordas do bote! Cortem! #gesto:explicar
espirito: Então os soldados cortaram as cordas do bote e o deixaram cair (At 27,32).
~ evento("cortar_bote")
espirito: Agora não há como fugir. Ou se salvam todos, ou ninguém.
-> END

= conforto
paulo: O dia está vindo. Fique perto. #gesto:acolher
-> END

= depois
{ shuffle:
- paulo: Comeram. Que bom. Gente com fome é gente com medo. #gesto:sim
- paulo: Lá está a terra. Deus cumpre o que promete. #gesto:ceu
}
-> END

// ─── O pão (At 27,33-38) ───

=== navio_pao ===
espirito: Enquanto o dia vinha raiando, Paulo pedia a todos que comessem. #plano:geral
paulo: Hoje faz catorze dias que vivem à espera, sem comer nada. Por isso vos peço que comais: é para a vossa salvação. #gesto:acolher
paulo: Nem um fio de cabelo da cabeça de nenhum de vós se perderá. #gesto:peito #plano:perto
espirito: Dito isso, tomou o pão, deu graças a Deus diante de todos, partiu-o e começou a comer (At 27,33-35). #plano:geral
* [Receber o pão das mãos de Paulo.]
    ~ evento("pao")
* [Partir o seu pedaço com o marinheiro ao lado.]
    ~ evento("pao")
    marinheiro: Pra mim? ... Obrigado. #gesto:triste
- espirito: Todos se animaram e comeram também. Eram ao todo duzentas e setenta e seis pessoas no navio (At 27,36-37).
espirito: Depois de comerem, aliviaram o navio, lançando o trigo ao mar (At 27,38).
espirito: Quando o dia clareou, não reconheciam a terra, mas avistaram uma enseada com uma praia (At 27,39). #pausa:0.8
espirito: (O naufrágio e a Ira são a próxima parte do caminho, ainda em construção.)
~ evento("amanhecer")
-> END

// ─── A gente a bordo ───

=== navio_lucas ===
{ tem("navio_anjo"):
    { shuffle:
    - lucas: Vou escrever tudo. O vento, as âncoras, o anjo. Alguém precisa lembrar que Deus estava aqui. #gesto:explicar
    - lucas: Duzentas e setenta e seis almas. Contei duas vezes. #gesto:sim
    }
- else:
    { shuffle:
    - lucas: Meus remédios estão encharcados. Mas uma mão no ombro ainda funciona. #gesto:triste
    - lucas: Ajude os marinheiros. Eu cuido de quem se machuca. #gesto:explicar
    }
}
-> END

=== navio_aristarco ===
{ shuffle:
- aristarco: Já vi multidão furiosa. Isto aqui é pior: é furiosa e com medo. #gesto:triste
- aristarco: Fique perto do mastro quando a onda vier. Eu já vi um homem ir para o mar. #gesto:explicar
- aristarco: Paulo não perdeu a calma uma vez sequer. Nem quando o chamaram de agourento. #gesto:sim
}
-> END

=== navio_julio ===
{ tem("navio_anjo"):
    { shuffle:
    - julio: Eu devia ter escutado. Não vou cometer o mesmo erro duas vezes. #gesto:triste
    - julio: Os presos ficam vivos. Todos. Enquanto eu mandar aqui. #gesto:explicar
    }
- else:
    { shuffle:
    - julio: Mantenha a ordem perto de você. Eu mantenho perto de mim. #gesto:explicar
    - julio: O piloto e o dono quiseram partir. Eu concordei. A culpa também é minha. #gesto:triste
    }
}
-> END

=== navio_piloto ===
{ shuffle:
- piloto: Não se governa contra esse vento. Só se corre com ele, e se reza. #gesto:explicar
- piloto: Não vejo sol nem estrela há dias. Não sei mais onde estamos. #gesto:triste
- piloto: O preso tinha razão. Não conte para o dono que eu disse isso. #gesto:triste
}
-> END

=== navio_nauclero ===
{ shuffle:
- nauclero: Meu navio... minha carga... tudo indo para o fundo! #gesto:nao
- nauclero: Não me olhe assim! Todo mundo quis partir! Todo mundo! #gesto:nao
- nauclero: Se esse navio afundar, eu afundo com ele. #gesto:triste
}
-> END

=== navio_soldado ===
{ shuffle:
- soldado: Os presos estão contados. Se um sumir, a pena é minha. #gesto:nao
- soldado: Nunca rezei para deus nenhum. Agora rezo para todos. #gesto:triste
}
-> END

=== navio_preso ===
{ shuffle:
- preso: Acorrentado num navio afundando. Que sorte a minha. #gesto:triste
- preso: O tal Paulo diz que ninguém morre. Eu quero acreditar. #gesto:sim
}
-> END

=== navio_marinheiro ===
{ shuffle:
- marinheiro: Água no porão! Sempre mais água no porão! #gesto:nao
- marinheiro: Segura firme! Segura! #gesto:explicar
- marinheiro: Catorze anos no mar, e nunca vi uma dessas. #gesto:triste
}
-> END
