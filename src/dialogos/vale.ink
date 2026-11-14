// ═══════════════════════════ O Vale do Esquecimento ═══════════════════════════

=== vale_intro ===
espirito: {nome()}, a estrada para o Céu começa aqui, junto a esta fogueira.
espirito: Sombras roubaram as cores do Vale. Chegue perto delas, trave a mira com Q e dissipe-as com o cajado ou com a luz.
espirito: A luz gasta energia espiritual. Quando faltar, pare e reze: segure R.
espirito: Logo adiante, à direita da estrada, há um jardim murado. Alguém espera por você lá dentro.
espirito: Depois, siga a estrada até a capela no alto do monte. Eu estarei com você.
~ marcar("intro")
-> END

=== vale_cruzeiro ===
{ primeira("cruzeiro"):
    espirito: Junto à cruz, a oração tem o dobro de força. Ajoelhe-se aqui quando estiver cansado.
- else:
    inscricao: "Eu sou o caminho, a verdade e a vida." (Jo 14,6)
}
-> END

=== vale_altar ===
{
- tem("veu_oeste"):
    espirito: O caminho a oeste está aberto. Depois das montanhas fica o Deserto das Vozes, onde Santo Antão espera por você.
- tem("lamparina"):
    espirito: Leve a Lamparina até a névoa de trevas, a oeste do Vale.
- valor("faltam_vale") == 0:
    espirito: O Vale voltou a ter cor. Mas a estrada continua: sob esta capela fica a cripta dos primeiros peregrinos.
    espirito: Lá embaixo há uma lamparina que nenhuma treva apaga. Desça pela escada ao lado da capela.
- else:
    ~ temp faltam = valor("faltam_vale")
    espirito: Ainda há {faltam} {faltam == 1: sombra|sombras} no Vale. Volte quando ele tiver recuperado as cores.
}
-> END

// ─── o jardim de Santo Agostinho e a porta estreita ───
// As falas de Agostinho vêm das Confissões (traduções nossas do latim): I,1; III,5; VIII,6-8; VIII,12; X,27.

=== vale_jardim_porta ===
espirito: Que porta tão baixa... De pé, ninguém passa por ela.
espirito: "Entrai pela porta estreita." (Mt 7,13) Faça-se pequen{g("o","a")}: segure Z para se ajoelhar, e entre de joelhos.
-> END

=== vale_jardim ===
crianca: Toma e lê! Toma e lê! #pausa:1.4
espirito: Uma criança canta do outro lado do muro... A humildade abriu a porta, e a graça entrou com você.
espirito: As graças fortalecem os dons. Aperte G quando quiser aplicá-las.
-> END

=== agostinho ===
{
- primeira("agostinho"):
    -> agostinho_conversao
- tem("veu_oeste"):
    agostinho: O caminho do oeste se abriu. No deserto você vai encontrar Antão, o pai dos monges. #gesto:acolher
    agostinho: Eu ouvi a história da vida dele pouco antes de me converter, e chorei de vergonha e de esperança. #gesto:peito
    agostinho: Os simples se levantam e tomam o Céu, e nós, com toda a nossa ciência, ficamos chafurdando na carne e no sangue. Não deixe para amanhã, {nome()}. #gesto:explicar
- else:
    agostinho: Tarde te amei, Beleza tão antiga e tão nova, tarde te amei! #gesto:ceu
    agostinho: Eu vivia dizendo "amanhã, amanhã"... Não deixe para amanhã, {nome()}. A capela fica no alto do monte. #gesto:explicar
}
-> END

=== agostinho_conversao ===
agostinho: Paz a você, {nome()}. Você entrou de joelhos. Eu levei mais de trinta anos para aprender a entrar assim. #gesto:acolher
agostinho: Eu me chamo Agostinho. Fui professor de retórica em Cartago, em Roma e em Milão, e tinha muito orgulho das minhas palavras. #gesto:peito
agostinho: Quando abri as Escrituras pela primeira vez, achei-as simples demais. Elas são humildes na entrada e sublimes lá dentro, e eu não sabia curvar a cabeça para entrar. #gesto:explicar
agostinho: Procurei a felicidade em toda parte: na fama, nos prazeres, nas ideias. E o coração continuava inquieto. #gesto:triste
agostinho: Minha mãe, Mônica, rezou e chorou por mim durante anos. Deus ouviu cada lágrima dela. #gesto:ceu
agostinho: Um dia, num jardim como este, debaixo de uma figueira, chorei como nunca tinha chorado. E uma criança cantava na casa vizinha: "Toma e lê, toma e lê." #plano:perto
agostinho: Peguei o livro do Apóstolo e li a primeira frase que meus olhos encontraram. Foi como se uma luz de paz entrasse no meu coração, e toda a escuridão da dúvida fugiu. #gesto:peito
* [O que dizia a frase?]
    agostinho: O livro está ali no banco, aberto na mesma página. Tome e leia. #gesto:explicar
* [Por que a porta do jardim é tão baixa?]
    agostinho: Porque Deus é grande, e a gente entra pequeno. O orgulho quer passar de pé, e não cabe. #gesto:sim
    agostinho: "Entrai pela porta estreita", disse o Senhor. Quem se abaixa não perde nada: ganha o caminho. #gesto:explicar
- agostinho: Fizeste-nos para ti, Senhor, e o nosso coração anda inquieto enquanto não descansa em ti. #gesto:ceu
agostinho: O Temor de Deus que está em você não é medo, {nome()}. É saber-se pequen{g("o","a")} diante d'Ele, e por isso não ter medo de mais nada. #gesto:explicar
agostinho: Siga a estrada até a capela no alto do monte. Quando as sombras pesarem, ajoelhe-se: de joelhos, ninguém fica para trás. #gesto:abencoar
-> END

=== vale_livro ===
inscricao: O livro está aberto na Carta de São Paulo aos Romanos.
inscricao: "Andemos com decência, como em pleno dia... Revesti-vos do Senhor Jesus Cristo." (Rm 13,13-14)
{ primeira("livro_agostinho"):
    espirito: Foi esta a frase que mudou a vida de Agostinho. Às vezes basta uma palavra, quando o coração está pronto.
}
-> END

// ─── sacramentos (cada capela de região tem confessionário e altar) ───

=== capela_confissao ===
// O peregrino está ajoelhado no confessionário; o padre fala do outro lado da grade.
padre: Em nome do Pai, e do Filho, e do Espírito Santo. #gesto:abencoar
{ primeira("confissao_padre"):
    padre: Seja bem-vind{g("o","a")}, {nome()}. Não tenha medo: aqui quem escuta é Deus, e Ele já estava à sua espera.
    padre: Diga com simplicidade aquilo que pesa no seu coração.
- else:
    padre: Que bom que você voltou, {nome()}. A misericórdia de Deus não se cansa de nós. O que pesa no seu coração?
}
* [Fui impaciente e deixei a raiva falar mais alto.]
    padre: A raiva promete justiça, mas deixa a alma em ruínas. Peça a Deus a mansidão do coração de Cristo.
* [Desanimei no caminho e deixei de rezar.]
    padre: O desânimo é uma tentação antiga. Quem cai e se levanta continua no caminho, e quem reza nunca anda sozinho.
* [Pensei mal dos outros e me achei melhor que eles.]
    padre: O orgulho nos afasta de Deus e dos irmãos. Lembre-se: tudo o que temos é dom recebido.
* [Não sei bem o que dizer.]
    padre: Então comecemos pelo amor. Você amou a Deus e ao próximo como podia? Onde faltou, Deus quer curar.
* [Ainda não, padre. Preciso pensar melhor.]
    padre: Deus não tem pressa. Examine o coração com calma e volte quando quiser: a porta fica aberta.
    -> END
- padre: Como penitência, reze um Pai-Nosso diante do sacrário, onde Jesus está presente na Eucaristia.
padre: Agora, arrependid{g("o","a")}, faça o seu ato de contrição.
* [Meu Deus, porque sois tão bom, arrependo-me de vos ter ofendido. Ajudai-me a não tornar a pecar.]
- padre: Deus, Pai de misericórdia, que pela morte e ressurreição de seu Filho reconciliou o mundo consigo, te conceda o perdão e a paz.
padre: E eu te absolvo dos teus pecados, em nome do Pai, e do Filho, e do Espírito Santo. #gesto:abencoar
~ evento("absolvicao")
padre: Vá em paz, e que o Senhor caminhe com você. #gesto:sim
{ primeira("confissao_explicada"):
    espirito: Você está em estado de graça. Sempre que se confessar, o caminho fica guardado aqui.
    espirito: Agora pode comungar: vá até a grade, diante do altar, e receba o Pão do Céu.
}
-> END

=== capela_sem_confissao ===
espirito: Antes de receber o Pão do Céu, reconcilie-se com Deus. O confessionário fica no fundo da capela, junto à porta.
-> END

=== capela_sacrario ===
// Diante do sacrário, a lâmpada vermelha acesa: Jesus está ali.
{ primeira("sacrario"):
    espirito: A lâmpada vermelha acesa diz que Jesus está aqui, no sacrário, presente na Eucaristia.
    espirito: Quando o caminho pesar, venha ficar um pouco com Ele. Ele sempre espera por você.
- else:
    inscricao: "Eis que estou convosco todos os dias, até o fim do mundo." (Mt 28,20)
}
-> END

=== capela_comunhao ===
espirito: Cristo está com você. Enquanto não cair, esse coração dourado é a força que Ele lhe deu.
-> END

=== vale_escada_selada ===
espirito: Uma laje pesada sela a escada. Ela só vai ceder quando o Vale tiver recuperado as cores.
-> END

=== vale_nevoa ===
espirito: Uma névoa de trevas fecha a passagem. Nem o cajado nem a sua luz a atravessam: é preciso uma luz que não se apague.
-> END

=== vale_nevoa_desfeita ===
espirito: A névoa se desfez diante da luz. O caminho a oeste está aberto.
-> END

=== vale_restaurado ===
espirito: Veja: o Vale recuperou suas cores! A luz venceu as sombras.
espirito: Agora suba a estrada até a capela no alto do monte.
-> END
