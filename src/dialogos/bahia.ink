// ═══════════════════════════ As Ruas da Bahia ═══════════════════════════
// Região de Santa Dulce dos Pobres (aperfeiçoa o dom da Piedade). Salvador, anos 1940 e 1950: a Cidade Baixa
// (o Comércio, Itapagipe, o Bonfim, os Alagados) e a Cidade Alta (o Terreiro, o Largo de São Francisco, o
// Pelourinho), ligadas pelo Elevador Lacerda. Ver docs/regioes/01-ruas-da-bahia.md.
//
// Já estão aqui: a chegada, Irmã Dulce e o menino, a casa abandonada e os esquecidos (os enfermos recolhidos para a
// porta do convento). O galinheiro, o hospital e o Coração de Pedra vêm depois.

=== cidade_estrada_mar ===
placa: Estrada do mar.
espirito: Ela desce até o porto. De lá, um saveiro atravessa o mar até a Baía de Todos os Santos.
espirito: Mas ainda não é hora. Esta cidade ainda está presa ao banquete da Gula.
-> END

=== bahia_chegada ===
placa: Salvador, na Baía de Todos os Santos. "Estive doente e me visitastes." (Mt 25,36)
espirito: Que cidade bonita... e que cinzenta. As portas estão fechadas, e o povo passa depressa, sem olhar para os lados.
espirito: Há gente caída nas calçadas, e ninguém para. Repare em quem passa ao largo.
espirito: No alto da escarpa fica a Cidade Alta. O elevador leva até lá. Ao norte, depois do Largo de Roma, fica a colina do Bonfim.
-> END

=== bahia_alta_chegada ===
placa: Praça Tomé de Sousa. Cidade Alta.
espirito: Daqui se vê a baía inteira. Adiante ficam o Terreiro de Jesus e o Largo de São Francisco; a ladeira desce para o Pelourinho.
-> END

=== bahia_cruzeiro ===
{ primeira("bahia_cruzeiro"):
    espirito: A cruz é de pedra, como o chão deste largo. Mas a pedra dela não é dura: é amor que se dá.
- else:
    inscricao: "Tirarei do vosso peito o coração de pedra e vos darei um coração de carne." (Ez 36,26)
}
-> END

// ─── O Coração de Pedra (seção 3; passo 8 da provação) ───

=== bahia_coracao ===
espirito: O chão do largo se levanta. É a dureza desta cidade: a indiferença de quem vê o doente e atravessa a rua. #plano:geral
espirito: Ele não olha para ninguém. Nada o fere enquanto a grade do peito estiver fechada.
espirito: A pedra está subindo nos enfermos. Socorra-os (F): a oração de quem se levanta racha a couraça. Com três, o coração fica à mostra.
espirito: E se o olhar cinzento cair sobre você, fique atrás de quem você socorreu.
-> END

=== bahia_coracao_vencido ===
espirito: Olhe: por dentro da pedra havia um coração de carne. Batendo. #plano:geral
espirito: "Tirarei do vosso peito o coração de pedra e vos darei um coração de carne" (Ez 36,26).
espirito: Ninguém mais vai passar ao largo. Escute: as portas estão se abrindo.
espirito: Volte ao hospital, lá embaixo. Irmã Dulce espera por você.
-> END

=== bahia_galinheiro ===
espirito: Um galinheiro velho, ao lado do convento. Chão de terra, telha de zinco, poleiros.
espirito: Parece pouco. Mas o que é pequeno, nas mãos de Deus, pode virar abrigo para muitos.
-> END

// ─── O Senhor do Bonfim (a capela da região) ───

=== bahia_bonfim_entrada ===
placa: Basílica do Senhor do Bonfim.
espirito: As fitinhas lá fora são pedidos e agradecimentos. Aqui dentro está Aquele a quem se pede. #plano:geral
espirito: O confessionário fica à esquerda, o sacrário junto do altar. Confesse, comungue, descanse: o caminho fica guardado aqui.
espirito: Na parede da direita, a porta da Sala dos Milagres.
{
- tem("bahia_coracao_vencido"):
    espirito: O sino tocou. A cidade voltou a olhar para os lados.
- tem("bahia_enfermaria"):
    espirito: Quando estiver pronto, suba à Cidade Alta, ao Largo do Cruzeiro de São Francisco. É lá que a dureza desta cidade tem o seu coração.
- else:
    espirito: Volte quando precisar. Irmã Dulce ainda conta com você lá embaixo, no Largo de Roma.
}
-> END

=== bahia_altar ===
{
- not tem("bahia_enfermaria"):
    espirito: Irmã Dulce está no Largo de Roma, junto dos doentes. Volte para ela.
- not tem("bahia_coracao_vencido"):
    espirito: "Tirarei do vosso peito o coração de pedra e vos darei um coração de carne" (Ez 36,26).
    espirito: O Coração de Pedra espera no Largo do Cruzeiro de São Francisco, na Cidade Alta. Quem vai até lá com piedade não vai sozinho.
- else:
    espirito: A cidade tem a cor de volta. Os que você levou nas costas deixaram o seu obrigado na Sala dos Milagres.
}
-> END

=== bahia_sala_milagres ===
espirito: A Sala dos Milagres. Aqui ninguém vem pedir: vem agradecer. #plano:geral
espirito: Casamentos, formaturas, crianças que cresceram. Cartas, fitinhas, corações de prata.
{
- tem("bahia_coracao_vencido"):
    espirito: E ali, na cortiça, cartas com nomes que você conhece.
- else:
    espirito: Um dia, quem você levou nas costas também vai deixar aqui o seu obrigado.
}
-> END

=== bahia_milagre_zefa ===
carta: "O meu Zé voltou da pescaria e me achou de pé, no catre de ferro, tomando mingau."
carta: "Ele chorou mais do que eu. Obrigada a quem me levou. Deus lhe pague. Josefa."
-> END

=== bahia_milagre_lucia ===
carta: "A tosse passou. Voltei a lavar roupa, agora para o hospital, e ninguém mais tem medo de mim."
carta: "Quem me carregou não teve medo primeiro. Lúcia."
-> END

=== bahia_milagre_bento ===
carta: "A perna sarou e a canoa voltou para a corda. Todo dia, quando saio para o mar, olho para o cais."
carta: "Agora eu sei que alguém entra na água. Bento, pescador."
-> END

=== bahia_milagre_raimundo ===
carta: "Voltei a andar. Carrego fardo de novo, mas agora carrego de graça o que os doentes precisam."
carta: "Aprendi nas suas costas. Raimundo."
-> END

=== bahia_milagre_ana ===
carta: "Quem escreve é a irmã da noite; eu dito. Continuo sem enxergar, mas não durmo mais nos degraus."
carta: "Reconheço o seu passo até hoje. Ana."
-> END

=== bahia_milagre_joao ===
carta: "O mestre de obras soube da febre, e me deu o serviço de volta assim mesmo. Mandei dinheiro para a mãe no interior."
carta: "Ninguém soube por você. Soube por mim, e não doeu. João."
-> END

=== bahia_alagados ===
espirito: Os Alagados: casas de tábua sobre a maré. Quando a água sobe, ela entra pelo assoalho.
espirito: É aqui que mora boa parte de quem a cidade esqueceu.
-> END

// ─────────────── Irmã Dulce ───────────────
// As falas são do roteiro do jogo, não citações dela. Ver docs/regioes/01-ruas-da-bahia.md, seção 2.

=== dulce ===
{
- not tem("bahia_dulce_conheceu"): -> encontro
- not tem("bahia_casa_aberta"): -> abrigo
- not tem("bahia_casa_expulsos"): -> entregar
- not tem("bahia_menino_abrigado"): -> ao_convento
- else: -> paz
}

= encontro
dulce: {g("Meu filho", "Minha filha")}! Por caridade, chegue aqui um instante. #plano:geral
dulce: Este menino está ardendo em febre. Achei ele encolhido nesta calçada. #gesto:triste
dulce: Bati em três portas. Nenhuma abriu.
* [Quem é a senhora?]
    dulce: Sou uma irmã do Convento de Santo Antônio, lá no Largo de Roma. O povo me chama de Irmã Dulce. #gesto:inclinar
* [O que ele tem?]
    dulce: Febre, fome, o frio da noite. Ninguém sabe o nome dele. E ninguém perguntou. #gesto:nao
* [Por que ninguém abre?]
    dulce: Medo. A doença assusta, a pobreza assusta. A cidade aprendeu a passar depressa. #gesto:triste
- dulce: Ele é tão leve... Quem pesa não é ele. É a gente fingir que não viu. #plano:perto
espirito: Repare: ela não pergunta de quem ele é. Pergunta só do que ele precisa.
dulce: Ele não pode passar mais uma noite na rua. Precisamos de um teto, qualquer teto. #gesto:ceu
dulce: Há casas fechadas nesta cidade, vazias, com o dono longe. Me ajuda a achar uma?
* [Eu ajudo.]
    dulce: Deus lhe pague, {g("meu filho", "minha filha")}. #gesto:sim
* [Não sei se vou conseguir.]
    dulce: Nem eu sei. Mas ele não pode esperar a gente saber. #gesto:sim
- dulce: Deus dá o jeito. A gente dá os braços.
~ marcar("bahia_dulce_conheceu")
espirito: Ajude Irmã Dulce a encontrar um abrigo para o menino. #pausa:0.8
-> END

= abrigo
{ shuffle:
- dulce: Junto ao cais, perto do Mercado, tem uma casa de porta pregada. Está vazia há meses. Veja se ela abre, {g("meu filho", "minha filha")}. #gesto:explicar
- dulce: A casa fechada, ali junto ao cais. Se a porta ceder, é teto para esta noite. #gesto:explicar
- dulce: Ainda não achamos um teto para ele. A febre não espera. Olhe a casa pregada junto ao cais. #gesto:triste
}
-> END

= entregar
dulce: A porta cedeu? Deus seja louvado! #gesto:ceu
dulce: Eu sou pequena, e ele já pesa nos meus braços. Você leva. Nas costas, devagar, que ele está fraco.
espirito: Com alguém nas costas, você anda devagar, não pula e não usa o cajado. Mas ainda pode rezar.
~ evento("carregar_menino")
dulce: Vá na frente. Eu vou logo atrás.
-> END

= ao_convento
dulce: Esta noite ele dorme à porta do convento, perto de mim. Leve-o você, {g("meu filho", "minha filha")}: é no Largo de Roma.
~ evento("carregar_menino")
-> END

= paz
{ tem("bahia_esquecidos_todos"): -> todos }
{ primeira("bahia_dulce_esquecidos"):
    dulce: O menino dormiu. A febre baixou um pouco. Mas eu não sossego sabendo dos outros. #gesto:pensar
    dulce: Nos Alagados, a maré isola quem tem febre nas palafitas. Junto do Mercado, os carregadores que se machucam ficam pelo chão.
    dulce: E lá em cima, no Pelourinho, há quem não tenha nem o degrau de uma igreja.
    dulce: Traga, {g("meu filho", "minha filha")}, um por um. Aqui na porta tem esteira para todos. #gesto:acolher
    espirito: Socorra os esquecidos da cidade e traga cada um nas costas até esta porta.
    -> END
}
-> dica

= dica
{
- not tem("bahia_recolhido_zefa") or not tem("bahia_recolhido_lucia"):
    dulce: Nas palafitas dos Alagados ainda há quem arda em febre sozinho. Ande pelas pinguelas e olhe as varandas. #gesto:explicar
- not tem("bahia_recolhido_bento"):
    dulce: Os pescadores dizem que a maré levou a canoa do Seu Bento com ele dentro. Ela parou lá fora, no raso, para lá do cais. #gesto:explicar
- not tem("bahia_recolhido_raimundo"):
    dulce: Junto do Mercado Modelo tem um carregador caído há dias. O povo passa em volta e não para. #gesto:triste
- not tem("bahia_recolhido_ana") or not tem("bahia_recolhido_joao"):
    dulce: Suba pelo elevador até o Pelourinho. Nos degraus do Rosário dos Pretos, e no beco ao lado, tem quem precise. #gesto:explicar
- else:
    dulce: Deus lhe pague, {g("meu filho", "minha filha")}. Hoje ninguém ficou na rua. #gesto:abencoar
}
-> END

= todos
{
- not tem("bahia_comerciante_pedido"): -> pedir
- tem("bahia_comerciante_doou"):
    {
    - not tem("bahia_galinheiro_licenca"): -> licenca
    - not tem("bahia_enfermaria"): -> no_galinheiro
    - else: -> na_enfermaria
    }
- tem("bahia_comerciante_raiva") and not tem("bahia_comerciante_manso"):
    dulce: Ele bateu a porta? E você respondeu à altura, não foi? #gesto:pensar
    dulce: Eu entendo. Mas a raiva fecha a porta que já estava meio aberta. Volte lá, {g("meu filho", "minha filha")}. Peça de novo, mansinho.
- tem("bahia_comerciante_manso"):
    dulce: Você não revidou? Então deixe. Quando a gente não devolve o mal, Deus trabalha no coração do outro. #gesto:ceu
- else:
    dulce: O armazém fica na avenida, perto de onde a gente se encontrou. Peça com humildade. #gesto:explicar
}
-> END

// ─── O galinheiro (seção 6, passo 6) ───
// Em 1949, com licença da superiora, Irmã Dulce transformou o galinheiro do convento em enfermaria (seção 2).
// As falas da cena são do roteiro.
= licenca
dulce: Eles comeram. Mas dormem no sereno, encostados na parede do convento. Se chover esta noite... #gesto:triste
dulce: Venha comigo. Vou pedir uma coisa à madre. #gesto:explicar
superiora: Irmã Dulce. Eu já sei o que a senhora vai pedir. #plano:geral
superiora: A porta do convento virou enfermaria. As irmãs passam por cima de doentes para ir à capela. #gesto:nao
dulce: Por isso mesmo, madre. Eles não podem ficar na porta. Mas também não podem voltar para a rua. #gesto:inclinar
dulce: O galinheiro, madre. Tem telhado. Com cal e esteira, cabe todo mundo.
superiora: O galinheiro? E as galinhas, que dão os ovos da casa? #gesto:surpresa
* [Deixar Irmã Dulce responder.]
    dulce: As galinhas dormem no quintal, madre. Os doentes não têm quintal. #gesto:acolher
* ["Madre, eu limpo o galinheiro. Hoje mesmo."]
    superiora: E quem é {g("este moço", "esta moça")}? #gesto:pensar
    dulce: Quem carregou cada um deles nas costas até esta porta, madre. #gesto:acolher
- superiora: ... #plano:perto
superiora: Está bem. As galinhas vão para o quintal. Mas a limpeza é por sua conta, e o serviço da casa não para. #gesto:sim
dulce: Deus lhe pague, madre! #gesto:ceu
~ marcar("bahia_galinheiro_licenca")
~ evento("dulce_galinheiro")
espirito: Limpe o galinheiro, ao lado do convento: os poleiros, o cocho e a palha.
-> END

= no_galinheiro
{
- not tem("bahia_galinheiro_limpo"):
    dulce: Primeiro a sujeira: os poleiros velhos, o cocho e a palha. Depois a gente pensa na cal. #gesto:explicar
- not tem("bahia_galinheiro_esteiras"):
    dulce: As esteiras estão enroladas junto da parede do fundo. Estenda uma para cada um. #gesto:explicar
- else:
    dulce: Traga um por um, da porta do convento. Devagar, que alguns ainda ardem em febre. #gesto:acolher
}
-> END

= na_enfermaria
{ shuffle:
- dulce: A Lúcia já tosse menos. Ontem cantou baixinho para o menino dormir. #gesto:acolher
- dulce: Um galinheiro, {g("meu filho", "minha filha")}. Quem diria. Nosso Senhor também nasceu entre os bichos. #gesto:ceu
- dulce: Suba a Colina Sagrada. O Senhor do Bonfim espera você. #gesto:explicar
}
-> END

// Ela manda o peregrino pedir: ela não pode deixar os doentes sozinhos.
= pedir
dulce: Eles têm uma esteira, mas não têm pão. E a tosse da Lúcia pede remédio. #gesto:triste
dulce: Na avenida, perto de onde a gente se encontrou, tem um armazém de secos e molhados. O dono tem muito e diz que não tem nada.
dulce: Vá você pedir por eles, que eu não posso sair daqui. #gesto:explicar
dulce: Peça com humildade. Se ele recusar, peça de novo. O pior que ele pode dizer é não.
~ marcar("bahia_comerciante_pedido")
espirito: Peça ao dono do armazém, na avenida, pelos pobres do abrigo.
-> END

=== bahia_casa_aberta ===
placa: As tábuas rangem e cedem. Lá dentro, chão de terra, telhado furado, uma esteira velha.
espirito: Não é muito. Mas é um teto. Volte à calçada e diga a Irmã Dulce.
-> END

// O dono chega quando o menino está deitado. Ela ocupou casas vazias e foi expulsa mais de uma vez (seção 2 do
// documento da região); a cena é o eco disso, e as falas são do roteiro.
=== bahia_dono ===
dono_casa: O que é isso? Quem mandou arrombar a minha casa? #plano:geral
dulce: Perdão, senhor. A casa estava vazia, e o menino está doente. É só por esta noite. #gesto:inclinar
dono_casa: Doente de quê? Isso pega! Não quero doença debaixo do meu telhado. #gesto:nao
* [Ele não tem para onde ir.]
    dono_casa: E eu com isso? A cidade está cheia de meninos assim.
* [Pedimos só uma noite.]
    dono_casa: Hoje é uma noite, amanhã são dez. Eu conheço a sua fama, irmã.
* [O senhor não tem coração?]
    dono_casa: Tenho uma casa, que é minha. Fora, os dois, ou chamo a polícia. #gesto:nao
- dulce: Está bem, senhor. Deus lhe pague mesmo assim. #gesto:inclinar
espirito: Ela não discute nem guarda raiva. Tem pressa de achar outro teto, não de ter razão.
dulce: Ponha ele nas costas de novo, {g("meu filho", "minha filha")}. Vamos ao convento.
~ evento("expulsos")
-> END

=== bahia_dono_depois ===
{ shuffle:
- dono_casa: Já disse: aqui não. Vá procurar outra porta.
- dono_casa: Essa irmã... toda semana uma casa. E toda semana alguém a põe para fora.
}
-> END

=== bahia_convento ===
dulce: Aqui. Deite ele nesta esteira, devagarinho. #plano:geral
dulce: Esta noite ele fica comigo, à porta do convento. Não é casa, mas é perto de quem reza por ele. #gesto:rezar
dulce: Amanhã eu falo com a superiora. Há de haver um canto, qualquer canto, para quem não tem nenhum.
espirito: E não é só ele. Nas palafitas, no mercado, nas ladeiras, há outros que a cidade deixou cair.
-> END

// ─────────────── Os esquecidos ───────────────
// Os doentes que a cidade deixou cair (entidades/Enfermos.ts). Cada um tem um nome, uma pequena história e um
// obstáculo: a maré, a fila dos que passam, o beco fechado. O fim de cada nó põe a pessoa nas costas do peregrino
// (`carregar_enfermo`); na porta do convento, `bahia_entrega_<id>`. As histórias são do roteiro do jogo.

=== bahia_enfermo_cedo ===
espirito: Alguém caído, ardendo em febre. Quem passa desvia os olhos.
espirito: Guarde este rosto. Primeiro ajude Irmã Dulce com o menino; depois, volte aqui.
-> END

=== bahia_enfermo_zefa ===
zefa: Quem está aí? É o meu Zé? #plano:perto
zefa: Não... O meu filho saiu para pescar faz três dias. A febre veio na mesma noite.
zefa: Os vizinhos vão para a maré cedo e voltam tarde. Ninguém tem tempo de olhar velha.
* [Eu vim buscar a senhora.]
    zefa: Me buscar? Para onde, {g("meu filho", "minha filha")}?
* [A senhora comeu alguma coisa?]
    zefa: Água de coco, ontem. Hoje, nada. Nem força tenho para levantar.
- espirito: Diga a ela: Irmã Dulce tem uma esteira à porta do convento, e alguém para cuidar.
zefa: A irmãzinha dos pobres? Então Deus se lembrou de mim.
zefa: Me leve. E, se o Zé voltar, que ele saiba onde eu estou.
~ evento("carregar_enfermo")
-> END

=== bahia_enfermo_lucia ===
lucia: {g("Não chegue perto, moço.", "Não chegue perto, moça.")} Essa tosse pega. Todo mundo diz. #plano:perto
lucia: Eu lavava roupa para as casas da Cidade Alta. Quando a tosse veio, me mandaram embora com a trouxa e tudo.
* [Eu não tenho medo.]
    lucia: Pois devia. Eu tenho, e é de mim mesma.
* [Há quanto tempo você está aqui?]
    lucia: Uma semana. A vizinha deixa um prato na varanda e corre.
- espirito: O medo da doença afasta. O amor chega perto com cuidado, mas chega.
lucia: Vai me carregar mesmo? Então vire o rosto para o lado, que eu tusso para o outro.
~ evento("carregar_enfermo")
-> END

=== bahia_enfermo_bento ===
bento: Ô de terra! Ainda bem que alguém veio pelo raso. #plano:perto
bento: A perna inchou de um corte de anzol. Deitei na canoa para descansar, e a maré soltou a corda.
bento: Fiquei aqui, olhando o cais. Vi gente passar o dia todo. Ninguém entrou na água.
* [Por que não gritou?]
    bento: Gritei até a voz acabar. O povo olha para o mar e só vê o mar.
* [Consegue se segurar em mim?]
    bento: Braço eu tenho. Perna é que não.
- espirito: A água pesa nos passos. Mas quem veio buscá-lo no raso já fez o mais difícil: entrou.
bento: Vamos devagar, que o fundo aqui é de lama.
~ evento("carregar_enfermo")
-> END

=== bahia_enfermo_raimundo ===
raimundo: Cuidado com eles. Passam por cima sem ver. #plano:perto
raimundo: Eu carregava fardo de cacau do saveiro para o armazém. Escorreguei na rampa, e o fardo caiu em cima da perna.
raimundo: O patrão disse que homem de perna quebrada não serve. Pagou o dia e foi embora.
* [Eu levo você.]
    raimundo: Logo eu, que passei a vida carregando o peso dos outros, agora nas costas de alguém.
* [Ninguém parou?]
    raimundo: Um menino deixou um pão. O resto dá a volta, como se eu fosse um poste.
- espirito: Repare na fila: com Raimundo nas suas costas, eles vão ter de olhar.
~ evento("carregar_enfermo")
-> END

=== bahia_enfermo_ana ===
ana: Quem é? Pelo passo, não é daqui. #plano:perto
ana: Eu não enxergo faz muitos anos, {g("meu filho", "minha filha")}. Peço esmola nos degraus do Rosário desde moça.
ana: Esta semana a fraqueza me derrubou. O sacristão diz que eu atrapalho a porta.
* [A senhora não atrapalha.]
    ana: Atrapalho, sim. Pobre sempre atrapalha alguma porta.
* [Venha comigo para um lugar com teto.]
    ana: Teto... Faz tempo que eu só conheço o da igreja, e pelo lado de fora.
- espirito: Ela não vê o seu rosto. Vai conhecer você pelo cuidado.
ana: Então me leve. Eu rezo o terço no caminho, para a ladeira ficar mais curta.
~ evento("carregar_enfermo")
-> END

=== bahia_enfermo_joao ===
joao: Como você passou? Eles não deixam ninguém entrar no beco. #plano:perto
joao: Não conte para ninguém, por favor. Se o mestre de obras souber que eu estou com febre, perco o serviço.
joao: Vim do interior faz dois meses. Durmo aqui desde que a febre veio. Não tenho a quem chamar.
* [Doente, você não aguenta a obra.]
    joao: Sem a obra eu não como. É isso ou isso.
* [Ninguém vai saber por mim.]
    joao: Deus lhe pague. Faz tempo que ninguém me promete nada.
- espirito: Ele tem vergonha de estar doente. Diga que há um lugar onde ninguém pergunta, só cuida.
joao: Está bem. Eu ando sozinho até lá.
Ele tenta se levantar, e as pernas não obedecem.
joao: ...Ou não ando.
~ evento("carregar_enfermo")
-> END

=== bahia_entrega_zefa ===
dulce: Dona Zefa! Deite aqui, devagar. Tem água fresca e um caldo no fogo. #plano:geral #gesto:acolher
zefa: E o meu Zé, irmã?
dulce: Vou mandar recado aos pescadores. Quando ele voltar, vai saber onde a mãe está. #gesto:sim
-> END

=== bahia_entrega_lucia ===
dulce: Lúcia, minha filha. Aqui ninguém vai mandar você embora. #plano:geral #gesto:acolher
lucia: Nem com a tosse?
dulce: Com tosse e tudo. Amanhã eu levo você ao médico do posto. #gesto:sim
-> END

=== bahia_entrega_bento ===
dulce: Seu Bento! Molhado até os ossos. Deite aqui, que eu vou ver essa perna. #plano:geral #gesto:acolher
bento: Se a irmã consertar a perna, eu trago peixe para todo mundo desta porta.
dulce: Trato feito. #gesto:sim
-> END

=== bahia_entrega_raimundo ===
dulce: Raimundo... A perna vai precisar de tala. Fique quieto aqui. #plano:geral #gesto:acolher
raimundo: Desculpe o trabalho, irmã.
dulce: Trabalho seria deixar você no chão. Isto aqui é alegria. #gesto:sim
-> END

=== bahia_entrega_ana ===
dulce: Dona Ana! A senhora aqui embaixo? Deite, que eu ponho um travesseiro. #plano:geral #gesto:acolher
ana: Irmã Dulce... Eu conheço essa voz. A senhora já me deu pão na escadaria.
dulce: E hoje lhe dou também um canto. #gesto:sim
-> END

=== bahia_entrega_joao ===
dulce: João, não é? Ninguém aqui vai contar nada ao seu mestre. Primeiro a febre baixa. #plano:geral #gesto:acolher
joao: E depois?
dulce: Depois a gente vê. Um dia de cada vez, meu filho. #gesto:sim
-> END

=== bahia_esquecidos_todos ===
dulce: Olhe só, {g("meu filho", "minha filha")}: a porta do convento virou enfermaria. #plano:geral #gesto:ceu
dulce: Mas não pode ficar assim. Vem chuva, vem frio, e eles estão ao tempo.
dulce: Ao lado do convento tem o galinheiro. Vou pedir à superiora. Se ela deixar, ali cabe todo mundo. #gesto:pensar
espirito: Cada um que você trouxe tinha um nome. A cidade esqueceu; Deus não.
-> dulce.pedir

// ─────────────── O comerciante ───────────────
// "Pedir pelos pobres" (seção 6, passo 5). Episódio da tradição sobre Irmã Dulce (seção 2): um comerciante cospe na
// mão estendida dela, e ela responde com mansidão, pedindo de novo para os pobres. Aqui quem estende a mão é o
// peregrino, mandado por ela; a resposta mansa é uma escolha dele, e as falas são do roteiro. Responder com raiva
// fecha a porta (pode-se voltar e pedir de novo); a resposta mansa faz o comerciante ir ao convento com a doação.

=== bahia_comerciante ===
{
- tem("bahia_comerciante_doou"): -> amigo
- tem("bahia_comerciante_manso"): -> bahia_comerciante_doacao
- not tem("bahia_comerciante_pedido"): -> antes
- tem("bahia_comerciante_raiva"): -> de_novo
- else: -> pedido
}

= antes
{ shuffle:
- comerciante: Não tenho troco. Passe bem.
- comerciante: Se veio comprar, entre. Se veio pedir, a porta é a da rua.
- comerciante: Hoje não. Nem amanhã.
}
-> END

= pedido
comerciante: Pois não? Se veio comprar, entre. Se veio pedir, nem comece. #plano:geral
* [Pedir pelos doentes do abrigo do convento.]
- comerciante: Ah, é da turma daquela freirinha. Toda semana ela manda alguém bater aqui.
comerciante: Eu trabalho de sol a sol. Ninguém nunca me deu nada. Por que eu haveria de dar? #gesto:nao
* [Estender a mão, aberta.]
- Você estende a mão aberta. Ele olha para ela, olha para você e cospe na palma.
espirito: Respire. O que você fizer agora diz quem você é.
* [Limpar a mão na roupa e estender de novo: "Isso foi para mim. E para os pobres, o que o senhor dá?"]
    Você limpa a mão na roupa, devagar, e a estende de novo, aberta.
    -> manso
* [Revidar: "O senhor é um miserável, e a cidade inteira vai saber!"]
    -> raiva
* [Baixar a cabeça e ir embora.]
    Você se vira e vai embora com a mão suja.
    espirito: Ir embora não é revidar. Mas também não é pedir, e os pobres continuam com fome.
    -> END

= manso
comerciante: ... #plano:perto
comerciante: O que é que você quer de mim? #gesto:nao
comerciante: Saia. Saia da minha porta.
Ele entra na loja e fecha a porta. Mas não bate.
espirito: Quem devolve mansidão a um insulto deixa o outro sem chão. Às vezes é aí que a pedra racha.
espirito: Volte ao abrigo. O resto é com Deus.
~ marcar("bahia_comerciante_manso")
~ evento("comerciante_sai")
-> END

= raiva
comerciante: Miserável sou eu? Fora daqui, antes que eu chame o guarda! #gesto:nao
A porta bate na sua cara.
espirito: A raiva pareceu justa. Mas fechou a porta que a mansidão podia abrir.
~ marcar("bahia_comerciante_raiva")
-> END

// Depois da raiva, a porta se abre de novo, mas ele não cospe mais: espera a briga.
= de_novo
comerciante: Você de novo? Veio terminar o sermão? #plano:geral
* [Pedir desculpas pelo que disse.]
    comerciante: Desculpa não enche barriga. Nem a sua, nem a dos seus doentes.
* [Pedir de novo pelos doentes, sem levantar a voz.]
    comerciante: Já disse que não. Está surdo?
- comerciante: E não me olhe assim, que eu não devo nada a ninguém.
* [Estender a mão, aberta, e esperar em silêncio.]
    Você estende a mão aberta e espera. Ele levanta a mão para afastar a sua, e para no meio do caminho.
    -> manso
* [Ir embora.]
    espirito: Hoje não. Mas não desista dele: Deus também não desistiu de você.
    -> END

= amigo
{ shuffle:
- comerciante: Diga à irmã que na segunda-feira tem mais farinha. #gesto:sim
- comerciante: Olhe quem chegou! Entre, entre. Hoje é por conta da casa. #gesto:acolher
- comerciante: A minha mulher perguntou o que deu em mim. Eu disse que foi uma mão aberta. #gesto:pensar
}
-> END

=== bahia_comerciante_doacao ===
comerciante: Irmã... Eu trouxe umas coisas. #plano:geral
comerciante: Farinha, feijão, açúcar. E o xarope que o boticário tinha, para a tosse.
dulce: Deus lhe pague, meu senhor. Os pobres agradecem. #gesto:acolher
comerciante: Não agradeça. Ainda agora eu cuspi na mão de quem veio pedir por eles. #gesto:triste
comerciante: E a mão continuou aberta. Não consegui ficar atrás do balcão.
dulce: Então o senhor já ganhou mais do que deu. #gesto:abencoar
espirito: Um coração de pedra amoleceu, e sem golpe nenhum. É assim que esta cidade vai voltar a ter cor.
~ evento("doacao")
-> END

// ─── O galinheiro: a limpeza, as esteiras, os doentes e a passagem de tempo ───

=== bahia_galinheiro_limpo ===
dulce: Olhe só! Já parece outro lugar. #plano:geral
dulce: Trouxe as esteiras do convento. Estenda uma para cada um, junto da parede do fundo. #gesto:explicar
-> END

=== bahia_galinheiro_esteiras ===
dulce: Seis esteiras, seis nomes. #gesto:acolher
dulce: Agora vá buscar cada um na porta do convento. Um de cada vez, que ninguém é fardo. #gesto:explicar
espirito: Leve cada um do abrigo, à porta do convento, para a sua esteira no galinheiro.
-> END

=== bahia_galinheiro_pronto ===
dulce: Dona Zefa, Lúcia, Seu Bento, Raimundo, Dona Ana, João. Todos debaixo de um telhado. #plano:geral #gesto:acolher
dulce: Ainda é um galinheiro. Mas Nosso Senhor nasceu numa estrebaria, não foi? #gesto:ceu
espirito: O que fizestes a um destes meus irmãos mais pequeninos, a mim o fizestes.
~ evento("passagem")
-> END

=== bahia_enfermaria ===
dulce: Veja, {g("meu filho", "minha filha")}! Cal nas paredes, catre de ferro, lamparina para a noite. #plano:geral #gesto:acolher
dulce: O comerciante mandou a cal e os catres. A madre mandou duas irmãs ajudarem no turno da noite.
dulce: E o menino ganhou um catre só dele. A febre foi embora de vez. #gesto:sim
dulce: Mas a cidade lá fora continua cinzenta. Tem alguma coisa endurecida no coração dela. #gesto:triste
dulce: Antes de qualquer coisa, suba a Colina Sagrada. Vá ao Senhor do Bonfim: reze, confesse, descanse. #gesto:explicar
espirito: Suba a Colina Sagrada até a Igreja do Senhor do Bonfim.
-> END

// ─── A madre superiora ───

=== bahia_superiora ===
{
- tem("bahia_enfermaria"):
    { shuffle:
    - superiora: Eu dei a licença. O resto quem deu foi Deus. E aquela teimosa. #gesto:sim
    - superiora: As galinhas se acostumaram com o quintal. Eu é que ainda não me acostumei com tanta gente na casa. #gesto:pensar
    }
- tem("bahia_galinheiro_licenca"):
    { shuffle:
    - superiora: A limpeza é por sua conta, lembra? Não deixe a Irmã Dulce carregar peso. #gesto:explicar
    - superiora: Ouvi dizer que as galinhas já reclamaram de você. #gesto:sim
    }
- else:
    { shuffle:
    - superiora: A porta do convento virou um corredor de doentes. Irmã Dulce não pede nada para ela. É isso que me tira o sono. #gesto:pensar
    - superiora: Paz e bem. Se veio por Irmã Dulce, ela está ali, junto dos doentes. Sempre junto dos doentes. #gesto:inclinar
    }
}
-> END
