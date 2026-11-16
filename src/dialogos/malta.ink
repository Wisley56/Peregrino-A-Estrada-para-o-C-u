// ═══════════════════════════ O Mar da Tempestade: Malta ═══════════════════════════
// Quarta e última parte da região de São Paulo: o fogo na praia, a víbora, Públio e o pai dele, os enfermos da ilha
// e a partida, três meses depois (At 28,1-11). Aqui se recebe o dom do Conselho e a cor volta ao mar.
// As falas de Atos e das cartas vêm com a referência; o resto é fala de personagem.
// O Conselho: as escolhas levam a tag #fruto (dentro dos colchetes), que só aparece a quem já tem o dom.
// Eventos (Jogo.eventoDeMalta): vibora_lanca, vibora_prende, vibora_sacode, dom_conselho, vibora_fim, boato,
// hospedar, rezar_pai, enfermo_<id>, curas, tres_meses, viajar_<destino>.

=== malta_chegada ===
placa: Malta. (At 28,1)
espirito: Os nativos nos trataram com rara humanidade: acenderam uma fogueira e acolheram a todos nós, por causa da chuva que caía e do frio (At 28,2). #plano:geral
espirito: Duzentas e setenta e seis pessoas molhadas até os ossos. O fogo ainda é pequeno para tanta gente.
espirito: Atrás da praia, na garriga, há gravetos secos. Junte alguns feixes e traga-os ao fogo.
-> END

// ─── A víbora (At 28,3-6) ───

=== malta_vibora ===
paulo: Mais um feixe, e o fogo aguenta a noite. #gesto:explicar #plano:geral
~ evento("vibora_lanca")
espirito: Paulo ajuntou um feixe de gravetos e o lançou ao fogo (At 28,3). #pausa:0.9
~ evento("vibora_prende")
espirito: E uma víbora, fugindo do calor, prendeu-se à mão dele (At 28,3). #pausa:0.8 #plano:perto
maltes: A cobra! Na mão dele! #gesto:surpresa
maltes: Certamente este homem é um assassino: salvou-se do mar, e a Justiça não o deixa viver (At 28,4). #gesto:nao
maltesa: Ele é um dos presos... Os soldados trazem ele acorrentado. #gesto:triste
* [Concordar com eles: "Alguma coisa ele fez." #fruto: Julgar pelo que aparece: o mesmo engano dos moradores, só que mais depressa.]
    ~ marcar("malta_vibora_julgou")
    espirito: Você julgou pelo que viu. Espere. O que se vê ainda não acabou.
    -> sacode
* [Correr para arrancar a cobra da mão dele. #fruto: O medo faz agir antes de olhar. E Paulo não precisa dessa ajuda.]
    ~ marcar("malta_vibora_correu")
    paulo: Calma. Fique onde está. #gesto:acolher
    -> sacode
* [Ficar firme e olhar para Paulo. #fruto: Quem espera antes de julgar vê o que Deus está fazendo.]
    ~ marcar("malta_vibora_esperou")
    espirito: Você não diz nada. Olha para ele. E ele não tem medo.
    -> sacode

= sacode
~ evento("vibora_sacode")
espirito: Mas ele, sacudindo o réptil no fogo, não sofreu mal nenhum (At 28,5). #pausa:1.6 #plano:geral
espirito: Eles esperavam que ele inchasse ou caísse morto de repente (At 28,6).
maltes: Não incha... Não cai... #gesto:pensar
maltesa: Ninguém aguenta essa mordida. Ninguém. #gesto:surpresa
espirito: Depois de esperar muito tempo e ver que nada de anormal lhe acontecia, mudaram de ideia e diziam que ele era um deus (At 28,6).
maltes: É um deus! Um deus saiu do mar! #gesto:ceu
paulo: Ouviu? Há pouco eu era um assassino. Agora sou um deus. E não sou nem uma coisa nem outra. #gesto:pensar #plano:perto
paulo: Em Listra quiseram nos oferecer sacrifícios, a mim e a Barnabé. Eu disse o que digo agora: "Também nós somos homens, sujeitos às mesmas paixões que vós" (At 14,15). #gesto:peito
paulo: Gente que julga depressa precisa de alguém que fale devagar. Vá falar com eles. #gesto:explicar
espirito: "Sobre ele repousará o Espírito do Senhor: espírito de sabedoria e de entendimento, espírito de conselho e de fortaleza" (Is 11,2). #plano:geral
~ evento("dom_conselho")
espirito: {nome()}, recebe o Conselho: saber o que fazer e o que dizer quando todos perdem a cabeça. #pausa:1.2
espirito: Agora, nas conversas, ao marcar uma resposta, você verá o fruto dela antes de escolher.
espirito: Quatro moradores tiraram cada um a sua conclusão da víbora. O ancião, a mulher do cesto, o pescador e o rapaz. Fale com eles.
~ evento("vibora_fim")
-> END

// ─── O que dizem da víbora: o Conselho em cada conversa ───

=== malta_anciao ===
{ tem("malta_boato_anciao"): -> depois }
{ tem("malta_vibora"): -> boato }
{ shuffle:
- maltes: Cheguem perto do fogo. O mar não perdoa ninguém nesta estação. #gesto:acolher
- maltes: Estrangeiros, presos, soldados... O frio é o mesmo para todos. Sentem. #gesto:explicar
}
-> END
= boato
maltes: Um deus? Bobagem dessa gente moça. A Justiça só está esperando. Ela tem paciência. #gesto:nao
maltes: Um homem acorrentado, que o mar devolve e a cobra morde... Alguma coisa ele fez. Eu vivi muito, sei como é.
* [Dizer que ele é um velho supersticioso. #fruto: A verdade dita com desprezo fecha o ouvido de quem escuta.]
    maltes: Supersticioso? Eu acendi o fogo que está esquentando você, menino. #gesto:nao
    espirito: Ele vira o rosto. A conversa acabou, por enquanto.
    -> END
* [Perguntar o que ele viu, e contar o que Paulo fez no navio. #fruto: Quem ouve primeiro é ouvido depois. E o que ele viu com os próprios olhos fala mais que um sermão.]
    maltes: O que eu vi? Vi a cobra pendurada na mão dele. E vi ele sacudir no fogo como quem tira um graveto. #gesto:pensar
    espirito: Você conta do navio: dos catorze dias, do anjo, do pão partido, de ninguém ter se perdido.
    maltes: Um homem que salva duzentas pessoas e reza por elas... Não é um assassino, é? #gesto:pensar
    maltes: Nem um deus. Um homem que o Deus dele guarda. Está certo. Vou dizer isso aos outros. #gesto:sim
    ~ marcar("malta_boato_anciao")
    ~ evento("boato")
    -> END
* [Concordar com ele, para não discutir. #fruto: O silêncio cômodo deixa o boato crescer.]
    maltes: Pois é. Fique de olho nele. #gesto:sim
    espirito: E o boato segue o seu caminho.
    -> END
= depois
{ shuffle:
- maltes: Um homem que o Deus dele guarda. Ainda estou pensando nisso. #gesto:pensar
- maltes: Vivi setenta invernos e nunca vi o mar devolver tanta gente viva. #gesto:ceu
}
-> END

=== malta_mulher ===
{ tem("malta_boato_mulher"): -> depois }
{ tem("malta_vibora"): -> boato }
{ shuffle:
- maltesa: Tome, um manto seco. Lã de ovelha da ilha. Não é bonito, mas esquenta. #gesto:acolher
- maltesa: Tanta gente... Vamos precisar de mais pão. #gesto:pensar
}
-> END
= boato
maltesa: Eu trouxe o pão da casa toda, e o melhor queijo. É para ele, o deus do mar. #gesto:peito
maltesa: Se a gente oferecer bem, ele abençoa as redes e os campos. Você leva para ele?
* [Aceitar as oferendas em nome de Paulo. #fruto: Honrar o homem no lugar de Deus: é o erro de que Paulo foge.]
    maltesa: Obrigada! Diga que é da casa de Tanit, junto ao poço. #gesto:sim
    espirito: Paulo não vai aceitar. E ela vai voltar para casa achando que pagou um deus.
    -> END
* [Dizer: "Ele é um homem como você. Leve o pão aos que estão com fome na praia." #fruto: A devoção dela vira caridade, e ninguém é enganado.]
    maltesa: Um homem... como eu? Mas a cobra... #gesto:surpresa
    maltesa: Está bem. Há crianças tremendo ali, e marinheiros que não comem há dias. #gesto:acolher
    maltesa: Se o Deus dele é desse jeito, que guarda e não pede queijo... eu queria conhecer. #gesto:pensar
    ~ marcar("malta_boato_mulher")
    ~ evento("boato")
    -> END
* [Rir dela. #fruto: A zombaria envergonha e não ensina.]
    maltesa: ... #gesto:triste
    espirito: Ela abaixa a cabeça e aperta o cesto contra o peito.
    -> END
= depois
{ shuffle:
- maltesa: O pão acabou. E ninguém ficou sem. #gesto:sim
- maltesa: Os marinheiros riram pela primeira vez desde que chegaram. #gesto:acolher
}
-> END

=== malta_pescador ===
{ tem("malta_boato_pescador"): -> depois }
{ tem("malta_vibora"): -> boato }
{ shuffle:
- maltes: Vocês bateram no banco de areia. Todo pescador desta baía conhece aquele banco. #gesto:explicar
- maltes: O navio grande ainda está lá fora, partido. O mar vai levar o resto em poucos dias. #gesto:triste
}
-> END
= boato
maltes: Vou correr ao povoado e a Melite! Um deus saiu do mar e a cobra não mata ele! #gesto:ceu
maltes: Até amanhã a ilha inteira vai estar aqui, com oferendas. Vai ser a maior festa de todas!
* [Deixar que conte: quanto mais gente, melhor. #fruto: Uma notícia falsa corre mais que o vento, e depois ninguém consegue desmenti-la.]
    maltes: Isso! Já vou! #gesto:sim
    espirito: E amanhã a ilha inteira virá adorar um preso. Paulo vai ter que desfazer tudo isso, um por um.
    -> END
* [Pedir que conte só o que viu, exatamente: a víbora, o fogo e um homem que reza. #fruto: A verdade inteira, sem enfeite, chega mais longe e fica de pé.]
    maltes: Só o que eu vi? #gesto:pensar
    maltes: A cobra, o fogo... e ele rezando depois, de olhos fechados, agradecendo a alguém. É verdade. Ele agradeceu. #gesto:pensar
    maltes: Vou contar assim. Quem quiser ver, que venha ver um homem que reza. #gesto:sim
    ~ marcar("malta_boato_pescador")
    ~ evento("boato")
    -> END
* [Proibir que ele fale disso. #fruto: O que se proíbe sem explicar vira segredo, e o segredo vira lenda.]
    maltes: E quem é você para me proibir? #gesto:nao
    -> END
= depois
{ shuffle:
- maltes: Contei do jeito que vi. Uns riram, outros vieram ver. #gesto:explicar
- maltes: O seu Paulo reza como quem conversa. Nunca vi ninguém rezar assim. #gesto:pensar
}
-> END

=== malta_rapaz ===
{ tem("malta_boato_rapaz"): -> depois }
{ tem("malta_vibora"): -> boato }
{ shuffle:
- maltes: Mais gravetos? Lá atrás, entre as pedras, tem muito. Cuidado com onde põe a mão. #gesto:explicar
- maltes: Nunca vi tanta gente sair do mar ao mesmo tempo! #gesto:surpresa
}
-> END
= boato
maltes: Se o deus dele protege contra cobra, eu vou pegar uma víbora também! Nas pedras tem um ninho. #gesto:explicar
maltes: Se eu for amigo dele, ela não me morde. Não é assim?
* [Desafiar: "Pegue uma, e veja." #fruto: Pôr Deus à prova é tentação, e o rapaz pode morrer.]
    maltes: Vou mesmo! #gesto:sim
    espirito: Ele corre para as pedras. Alguém vai ter que ir atrás dele antes que seja tarde.
    -> END
* [Dizer: "Não tentarás o Senhor teu Deus (Mt 4,7). Paulo não procurou a víbora: ela veio, e Deus o guardou." #fruto: A palavra certa desfaz a imprudência antes que ela vire desgraça.]
    maltes: Ele não procurou... ela veio. #gesto:pensar
    maltes: Então não é magia. É que o Deus dele cuida dele quando o perigo vem sozinho. #gesto:pensar
    maltes: Está bem. Deixo o ninho em paz. Mas quero ouvir esse Paulo falar. #gesto:sim
    ~ marcar("malta_boato_rapaz")
    ~ evento("boato")
    -> END
* [Ir com ele procurar o ninho. #fruto: Acompanhar o erro de alguém não o torna menos perigoso.]
    maltes: Vamos! #gesto:sim
    espirito: Você para no meio do caminho. Ele, não. Melhor falar com ele de novo.
    -> END
= depois
{ shuffle:
- maltes: O ninho continua lá. Eu também continuo aqui. #gesto:sim
- maltes: Paulo disse que o Deus dele é o mesmo que fez o mar. Eu não sabia que o mar tinha dono. #gesto:pensar
}
-> END

// ─── Públio (At 28,7-8) ───

=== malta_publio_chega ===
espirito: Lá do alto vem um homem de toga branca, com um criado atrás. #plano:geral
publio: Sou Públio. Tenho a primeira autoridade nesta ilha. #gesto:inclinar
publio: Me contaram de um navio partido, de uma víbora e de um homem que ela não matou. E me contaram também que ele não é um deus. #gesto:pensar
paulo: Contaram certo. Sou um homem, e preso. Paulo, a caminho de César. #gesto:peito
publio: Minhas terras ficam aqui perto. A praia não é lugar para passar o inverno. Venham para a minha casa: o centurião, os seus companheiros e você. #gesto:acolher
espirito: Nos arredores daquele lugar havia terras do principal da ilha, chamado Públio, que nos recebeu e hospedou com bondade durante três dias (At 28,7).
publio: Peço só uma coisa: não reparem se a casa estiver triste. Meu pai está de cama. #gesto:triste
~ evento("hospedar")
-> END

=== malta_publio ===
{ tem("malta_curas"): -> honras }
{ tem("malta_pai_curado"): -> curado }
{ tem("malta_pai_rezar"): -> rezando }
{ tem("malta_publio"): -> pai }
{ tem("malta_boatos"): -> malta_publio_chega }
publio: ... #gesto:pensar
-> END
= pai
publio: Este é meu pai. Está de cama com febre e disenteria (At 28,8). Há dias não come. #gesto:triste #plano:geral
publio: Os médicos de Melite vieram, e foram embora sem dizer nada. Eu sei o que esse silêncio quer dizer.
paulo: Deixe-me entrar onde ele está. #gesto:acolher
espirito: Paulo se aproxima do leito e se ajoelha. Começa a orar. #plano:perto
paulo: Reze comigo. Ajoelhe-se aqui. #gesto:rezar
~ evento("rezar_pai")
-> END
= rezando
publio: Reze com ele. Por favor. #gesto:triste
-> END
= curado
{ tem("malta_enfermo_febril") and tem("malta_enfermo_coxo") and tem("malta_enfermo_cego") and tem("malta_enfermo_mae"):
    publio: O pátio está cheio de gente. Minha casa nunca recebeu tanta gente, nem nas festas. #gesto:acolher
- else:
    publio: A notícia correu. Há doentes no povoado, no porto, à porta de Melite e numa casa ao sul. Diga a eles que venham. Minha casa está aberta. #gesto:explicar
}
-> END
= honras
{ shuffle:
- publio: Vocês não vão partir de mãos vazias. A ilha inteira quer dar alguma coisa. #gesto:acolher
- publio: Paulo me falou do Deus dele. Eu ainda tenho muito a perguntar. Temos o inverno inteiro. #gesto:pensar
}
-> END

=== malta_pai_curado ===
pai_publio: A febre... passou. #gesto:surpresa #plano:perto
pai_publio: Tenho fome! Quanto tempo faz que eu não digo isso? #gesto:ceu
espirito: Paulo foi vê-lo e, depois de orar, impôs-lhe as mãos e o curou (At 28,8). #plano:geral
publio: Pai! #gesto:acolher
paulo: Não fui eu. Foi aquele em nome de quem eu rezo: Jesus, o Cristo, que eu anuncio. #gesto:ceu
espirito: A notícia vai correr a ilha. Há outros doentes: no povoado, junto ao poço; no porto; à porta de Melite; e numa casa ao sul.
espirito: Vá dizer a eles que venham à casa de Públio.
-> END

=== malta_pai ===
{ tem("malta_pai_curado"):
    { shuffle:
    - pai_publio: Comi como um menino. Meu filho riu de mim. #gesto:sim
    - pai_publio: Setenta anos adorando os deuses da ilha, e é um preso estrangeiro que me levanta da cama. #gesto:pensar
    }
- else:
    pai_publio: ... água... #gesto:triste
}
-> END

=== malta_criado ===
{ tem("malta_curas"):
    criado: O senhor Públio mandou separar trigo, azeite e mantos para a viagem de vocês. #gesto:explicar
- else:
    { tem("malta_pai_curado"):
        criado: O velho senhor de pé! A casa toda chorou hoje. Chorou de alegria. #gesto:ceu
    - else:
        criado: A casa do senhor Públio. Entre: ele mandou receber vocês como se fossem da família. #gesto:inclinar
    }
}
-> END

// ─── Os enfermos da ilha (At 28,9) ───

=== malta_febril ===
{ tem("malta_curas"): -> curada }
{ tem("malta_enfermo_febril"): -> indo }
{ tem("malta_pai_curado"): -> avisar }
maltesa: A febre vem e vai, vem e vai. Vim buscar água, e não consigo levantar o balde. #gesto:triste
-> END
= avisar
maltesa: Você é dos que vieram do mar? Dizem que o velho pai de Públio se levantou da cama. #gesto:pensar
* [Dizer: "Venha à casa de Públio. Paulo reza pelos doentes, e Deus ouve." #fruto: Convidar sem prometer o que não é seu: ela vai com esperança, não com uma dívida.]
    maltesa: Então eu vou. Devagar, mas vou. #gesto:sim
    ~ evento("enfermo_febril")
    -> END
* [Dizer: "Paulo cura qualquer um. É garantido." #fruto: Prometer milagre em nome de outro é falar o que não se sabe.]
    maltesa: Garantido? Ninguém garante nada nesta vida... Mas eu vou ver. #gesto:pensar
    espirito: Ela vai. Mas não foi você quem curou o velho, nem será. Deus não se garante como um negócio.
    ~ evento("enfermo_febril")
    -> END
= indo
maltesa: Já estou indo para a casa de Públio. #gesto:sim
-> END
= curada
maltesa: A febre foi embora e não voltou. Hoje carreguei dois baldes cheios. #gesto:ceu
-> END

=== malta_coxo ===
{ tem("malta_curas"): -> curado }
{ tem("malta_enfermo_coxo"): -> indo }
{ tem("malta_pai_curado"): -> avisar }
maltes: Uma rede pesada caiu na minha perna, faz anos. Desde então, o porto é o mais longe que eu vou. #gesto:triste
-> END
= avisar
maltes: A casa de Públio fica longe para quem anda de muleta, estrangeiro. #gesto:nao
* [Dizer: "Vá devagar pela estrada. Lá rezam pelos doentes. Eu aviso que você vem." #fruto: Respeitar o passo dele é parte da caridade: ninguém chega mais depressa porque foi empurrado.]
    maltes: Devagar eu sei ir. É o único jeito que eu sei. #gesto:sim
    ~ evento("enfermo_coxo")
    -> END
* [Dizer: "Se tivesse fé, você jogava essa muleta agora mesmo." #fruto: Cobrar a fé de quem sofre é pôr um peso a mais em quem já carrega.]
    maltes: ... #gesto:triste
    espirito: Ele aperta a muleta. Mas, depois de um tempo, levanta-se e começa a andar para a estrada.
    ~ evento("enfermo_coxo")
    -> END
= indo
maltes: Vou indo. Devagar, mas vou. #gesto:sim
-> END
= curado
maltes: Andei da casa de Públio até o porto sem parar. Sem muleta! #gesto:ceu
-> END

=== malta_cego ===
{ tem("malta_curas"): -> curado }
{ tem("malta_enfermo_cego"): -> indo }
{ tem("malta_pai_curado"): -> avisar }
maltes: Uma esmola para o velho cego da porta de Melite... Ou só uma palavra. Uma palavra também serve. #gesto:triste
-> END
= avisar
maltes: Ouvi passos de estrangeiro. Você vem da praia? Dizem que houve um milagre na casa de Públio. #gesto:pensar
* [Oferecer o braço e dizer: "Venha. Eu digo ao criado de Públio que você vem." #fruto: Quem não vê precisa de um caminho, não de um discurso.]
    maltes: Meu menino de recados me leva. Mas obrigado pelo braço, e pela palavra. #gesto:sim
    ~ evento("enfermo_cego")
    -> END
* [Contar o milagre com detalhes, sem dizer que ele pode ir. #fruto: Uma boa notícia contada a quem não pode alcançá-la vira só mais uma dor.]
    maltes: Que bom para o velho. E eu, aqui na porta... #gesto:triste
    espirito: Ele espera. Você não disse o que ele precisava ouvir.
    -> END
= indo
maltes: O menino está me levando. Ele diz que a estrada é bonita. #gesto:sim
-> END
= curado
maltes: O mar... O mar é desta cor? Eu tinha esquecido. Ou nunca soube. #gesto:ceu
-> END

=== malta_mae ===
{ tem("malta_curas"): -> curado }
{ tem("malta_enfermo_mae"): -> indo }
{ tem("malta_pai_curado"): -> avisar }
maltesa: Meu filho arde em febre há três dias. Não chora mais. Isso é o que mais me assusta. #gesto:triste
-> END
= avisar
maltesa: O pai de Públio sarou? Meu filho... será que...? #gesto:pensar
* [Dizer: "Leve-o à casa de Públio. Eu rezo com vocês pelo caminho." #fruto: A esperança dita junto com a presença: ela não vai sozinha.]
    maltesa: Eu levo. Nos braços, se for preciso. #gesto:acolher
    ~ evento("enfermo_mae")
    -> END
* [Dizer: "Tenha calma, deve ser só uma febre." #fruto: Diminuir a dor de uma mãe não a consola: só a faz se sentir sozinha.]
    maltesa: Só uma febre? Você não viu os olhos dele. #gesto:nao
    -> END
= indo
maltesa: Estamos indo. Ele está quieto nos meus braços. #gesto:triste
-> END
= curado
maltesa: Ele chorou! Chorou de fome, como uma criança de verdade! Nunca fiquei tão feliz com um choro. #gesto:ceu
-> END

=== malta_menino ===
{ shuffle:
- maltes: Eu estava com muito calor. Agora não estou mais. #gesto:sim
- maltes: Minha mãe não para de me abraçar. #gesto:acolher
}
-> END

// ─── Paulo e os companheiros ───

=== malta_paulo ===
{ tem("malta_tres_meses"): -> partida }
{ tem("malta_curas"): -> honras }
{ tem("malta_pai_curado"): -> enfermos }
{ tem("malta_pai_rezar"): -> rezar }
{ tem("malta_publio"): -> casa }
{ tem("malta_boatos"): -> publio }
{ tem("malta_vibora"): -> boatos }
paulo: Mais gravetos. Esta gente está gelada, e o fogo ainda é pequeno. #gesto:explicar
-> END
= boatos
{ shuffle:
- paulo: Palavra mansa e palavra verdadeira: as duas juntas. Uma sem a outra não serve. #gesto:explicar
- paulo: Fale com eles como quem quer bem a eles. Ninguém aprende com quem o despreza. #gesto:acolher
}
-> END
= publio
paulo: O principal da ilha veio nos ver. Fale com ele. #gesto:explicar
-> END
= casa
paulo: Públio nos espera na casa dele, lá em cima. O pai dele está doente. #gesto:explicar
-> END
= rezar
paulo: Reze comigo, aqui junto ao leito. #gesto:rezar
-> END
= enfermos
{ valor("malta_no_patio") == 1: -> malta_curas }
{ tem("malta_enfermo_febril") and tem("malta_enfermo_coxo") and tem("malta_enfermo_cego") and tem("malta_enfermo_mae"):
    paulo: Estão vindo. Esperemos por eles. #gesto:rezar
- else:
    paulo: Há mais doentes na ilha. No povoado, no porto, à porta de Melite e numa casa ao sul. Vá dizer a eles que venham. #gesto:explicar
}
-> END
= honras
{ shuffle:
- paulo: Na prisão eu aprendi uma coisa: a palavra de Deus não está acorrentada (2Tm 2,9). #gesto:ceu
- paulo: Quando o mar abrir, seguimos para Roma. Júlio está no porto, cuidando do navio. #gesto:explicar
- paulo: Você atravessou a tempestade sem responder à fúria com fúria. Isso é mais difícil do que segurar uma víbora. #gesto:acolher
}
-> END
= partida
paulo: Roma. Há anos eu peço a Deus para ver os irmãos de lá (Rm 1,10-11). #gesto:ceu
-> END

=== malta_curas ===
paulo: Estão todos aqui. Rezemos. #gesto:rezar #plano:geral
espirito: Paulo vai de um a outro. Ora, impõe as mãos. A mulher da febre, o pescador da muleta, o velho cego, o menino nos braços da mãe.
~ evento("curas")
espirito: Depois disso, também os outros que tinham enfermidades na ilha vinham e eram curados (At 28,9). #pausa:1.4
maltesa: Meu filho! Ele está de pé! #gesto:ceu
maltes: Eu vejo... Eu vejo o mar. #gesto:surpresa
espirito: Eles nos honraram com muitas atenções e, quando partimos, puseram a bordo o que nos era necessário (At 28,10).
espirito: {nome()}, olhe o mar. #plano:geral
espirito: A tempestade foi atravessada. Duzentas e setenta e seis almas, e nenhuma se perdeu. A Ira não teve a última palavra.
espirito: E o mar voltou a ter cor.
paulo: O inverno vai ser longo. Quando o mar abrir, seguimos viagem. Fale com Júlio no porto quando estiver pronto. #gesto:explicar
-> END

=== malta_lucas ===
{ tem("malta_curas"):
    lucas: Escrevi tudo: o fogo, a víbora, Públio, os doentes. "Nos trataram com rara humanidade" (At 28,2). Quero que isso fique. #gesto:explicar
- else:
    { tem("malta_vibora"):
        lucas: Sou médico. Vi a víbora. Ninguém sobrevive a uma mordida daquelas. Vou escrever isto também. #gesto:pensar
    - else:
        lucas: Esta gente não nos conhece e nos deu o fogo. Humanidade rara, esta. #gesto:acolher
    }
}
-> END

=== malta_aristarco ===
{ tem("malta_curas"):
    aristarco: Fui preso com ele mais de uma vez. Ele nunca muda: em Éfeso, no navio, aqui. Sempre o mesmo Cristo na boca. #gesto:ceu
- else:
    aristarco: Quatorze dias sem comer, e agora um fogo e pão. Deus é bom, peregrino. #gesto:sim
}
-> END

=== malta_julio ===
{ tem("malta_tres_meses"): -> partida }
{ tem("malta_curas"): -> honras }
{ shuffle:
- julio: Ninguém fugiu. Nem com a praia livre, nem com o fogo aceso. Nunca vi presos assim. #gesto:pensar
- julio: Vou ter que contar tudo isso em Roma. E não sei se vão acreditar. #gesto:explicar
}
-> END
= honras
julio: Há um navio de Alexandria no porto. Passou o inverno aqui. Quando o mar abrir, embarcamos nele. #gesto:explicar #plano:geral
julio: Até lá, ficamos na ilha. São três meses.
* [Esperar o fim do inverno. #fruto: Três meses passam. O que foi semeado nesta ilha fica.]
    julio: Então que passe o inverno. #gesto:sim
    ~ evento("tres_meses")
    -> END
* [Ainda não: há coisas a fazer na ilha.]
    julio: O navio não sai sem mim. Fale comigo quando quiser. #gesto:sim
    -> END
= partida
julio: Soldados, presos, todos a bordo. Roma está esperando. #gesto:explicar
-> END

=== malta_soldado ===
{ tem("malta_curas"):
    soldado: Um preso que cura os doentes da ilha. O centurião não sabe se o guarda ou se pede a bênção dele. #gesto:pensar
- else:
    soldado: Ninguém foge. Para onde fugiria? É uma ilha. #gesto:nao
}
-> END

=== malta_preso ===
{ tem("malta_curas"):
    preso: Ele não fugiu quando podia. Nem eu. Não sei explicar. #gesto:pensar
- else:
    preso: Os soldados queriam nos matar. Agora a gente se esquenta no mesmo fogo. #gesto:triste
}
-> END

=== malta_piloto ===
{ tem("malta_curas"):
    piloto: O navio novo é bom. Alexandrino, como o nosso. Desta vez eu ouço o preso antes de sair do porto. #gesto:sim
- else:
    piloto: Eu disse que Fênix era melhor para o inverno. Ele disse que não devíamos sair. Ele estava certo. #gesto:triste
}
-> END

=== malta_nauclero ===
{ tem("malta_curas"):
    nauclero: Perdi o navio e o trigo. Ganhei a vida. Não sei se já entendi a troca, mas sei que foi boa. #gesto:pensar
- else:
    nauclero: Todo o trigo de Alexandria, no fundo do mar. E eu aqui, vivo, me esquentando no fogo de estranhos. #gesto:triste
}
-> END

=== malta_marinheiro ===
{ tem("malta_curas"):
    marinheiro: Três meses em terra firme. Depois daquela tempestade, até que não é ruim. #gesto:sim
- else:
    marinheiro: Fogo! Fogo de verdade! Quatorze dias eu sonhei com isso. #gesto:ceu
}
-> END

=== malta_naufrago ===
{ shuffle:
- marinheiro: Achei que ia morrer agarrado àquela tábua. #gesto:triste
- marinheiro: Nenhum se perdeu. Ele disse que seria assim, e foi. #gesto:pensar
- marinheiro: O povo daqui é bom. Nem perguntaram quem a gente era. #gesto:acolher
}
-> END

// ─── O barco, a partida e o embarque ───

=== malta_barco ===
maltes: Um barco de pesca vai mais longe do que parece, se o vento ajudar. E o Espírito, dizem, leva onde o vento não leva. #gesto:explicar
* [Ir à Bahia.]
    ~ evento("viajar_bahia")
* [Ir a Creta.]
    ~ evento("viajar_creta")
* [Ir à Cidade Dourada.]
    ~ evento("viajar_cidade")
* [Ficar em Malta.]
- -> END

=== malta_partida ===
espirito: Três meses depois, embarcamos num navio de Alexandria que tinha passado o inverno na ilha e trazia a insígnia dos Dióscuros (At 28,11). #plano:geral
publio: O trigo, o azeite, os mantos: está tudo a bordo. E vai com vocês a gratidão de Malta. #gesto:acolher
pai_publio: Diga ao seu Deus que um velho desta ilha lembra dele todo dia. #gesto:ceu
paulo: Ele sabe. Mas diga você mesmo a ele, todo dia. Ele gosta de ouvir. #gesto:abencoar
espirito: Quando quiser, embarque pela prancha. Siracusa, Régio, Putéoli e, por fim, Roma (At 28,12-14).
-> END

=== malta_embarque ===
espirito: O navio dos Dióscuros vai a Siracusa, Régio e Putéoli. De lá, a pé, até Roma (At 28,12-16). #plano:geral
espirito: (Roma, as Catacumbas e a Arena são a próxima região do caminho, ainda em construção.)
-> END
