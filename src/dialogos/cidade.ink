// ═══════════════════════════ A Cidade Dourada ═══════════════════════════
// Região de São Francisco de Assis (dom da Piedade). Os pobres ficam fora do ouro: o leproso na estrada,
// Tomás na porta, Rita na praça, Beppo nos degraus da capela. A Gula larga iscas pelas ruas.
//
// Eventos (Jogo.eventoDialogo): dom_piedade, curar_leproso, socorrer_<pobre>, doar_<pobre>, pacto_lobo,
// retribuir_<quem>. Valores (Jogo.valorDialogo): peso, energia, custo_piedade, pedras, faltam_pobres.

=== deserto_estrada_fechada ===
placa: Estrada velha para o sul.
espirito: Ela sobe para longe, para uma cidade que brilha no alto do monte. Mas ainda não é hora.
espirito: Primeiro vença o que mora depois da fenda, no Poço do Meio-Dia.
-> END

=== cidade_chegada ===
placa: Cidade Dourada. "Onde está o teu tesouro, aí estará o teu coração." (Mt 6,21)
espirito: Lá no alto, a cidade brilha. Os ricos douraram as casas e a praça, e esqueceram quem ficou do lado de fora.
espirito: Fora dos muros, a oeste, há uma capelinha em ruínas: São Damião. Ali reza um homem pobre, que já foi o mais rico desta cidade.
-> END

=== cidade_cruzeiro ===
{ primeira("cidade_cruzeiro"):
    espirito: Também aqui, junto à cruz, a oração tem o dobro de força.
- else:
    inscricao: "Bem-aventurados os pobres em espírito, porque deles é o Reino dos Céus." (Mt 5,3)
}
-> END

=== cidade_fonte ===
espirito: A água é a mesma para ricos e pobres. Só a taça é que foi dourada.
-> END

=== cidade_palacio ===
{ tem("dom_piedade"):
    espirito: Lá dentro, a Gula dá um banquete que nunca acaba. Quem entra come e não se sacia.
    espirito: As portas de ouro estão trancadas por dentro. Termine o que Francisco pediu: reconstruir São Damião e fazer as pazes com o lobo. E sirva os pobres: quem você ajudar irá com você.
- else:
    espirito: Ouve? Risadas, pratos, música. É um banquete que começou faz muito tempo e não acaba nunca.
    espirito: As portas estão trancadas. Procure primeiro Francisco, em São Damião, fora dos muros.
}
-> END

=== cidade_dica_peso ===
gula: Pegue. É seu. Você caminhou tanto, merece um pouco de conforto.
espirito: Sentiu o peso? Isto é a Gula: ela dá o que é bom demais, e o que é bom demais pesa.
espirito: Com peso você anda devagar e quase não pula. O ouro só fica leve de um jeito: dando-o a quem precisa.
-> END

=== cidade_dica_pobres ===
espirito: Ninguém olha para os pobres desta cidade. Fale com eles: Tomás na porta, Rita na praça, Beppo nos degraus da capela.
-> END

=== cidade_altar ===
{
- not tem("dom_piedade"):
    espirito: Procure Francisco em São Damião, fora dos muros, a oeste da estrada.
- not tem("cidade_leproso"):
    espirito: Francisco pediu que você voltasse ao leproso, junto à estrada. Faça por ele o que Francisco fez.
- valor("faltam_pobres") > 0:
    espirito: Ainda há pobres esperando na cidade. "Tudo o que fizestes a um destes meus irmãos mais pequeninos, a mim o fizestes." (Mt 25,40)
- not tem("cidade_lobo"):
    espirito: Do lado de fora, a leste, um lobo assusta a cidade. Francisco o chamaria de irmão.
- not tem("cidade_damiao"):
    espirito: São Damião ainda está em ruínas. Leve pedras da pedreira velha até lá.
- else:
    espirito: A cidade aprendeu a repartir. Só o banquete da Gula continua, atrás das portas de ouro.
}
-> END

=== cidade_restaurada ===
espirito: Olhe as cores da cidade! Não foi o ouro que voltou a brilhar: foram as pessoas.
-> END

// ─────────────────────────────── São Francisco ───────────────────────────────

=== francisco ===
{
- not tem("dom_piedade"): -> encontro
- not tem("cidade_leproso"): -> sobre_leproso
- not tem("cidade_damiao"): -> casa
- not tem("cidade_lobo"): -> sobre_lobo
- tem("gula_vencida"): -> vitoria
- else: -> paz
}

= encontro
francisco: Paz e bem, {nome()}! O Senhor te dê a paz. Eu sou Francisco, filho de Pedro Bernardone, o mercador de panos.
francisco: Você conhece aquela cidade lá no alto? Eu nasci nela. Era o rei das festas: o melhor vestido, a mesa mais farta, o vinho que não acabava.
* [Por que deixou tudo?]
    francisco: Um dia, a cavalo, encontrei um leproso na estrada. Senti nojo. Quis fugir dele.
* [O que aconteceu com você?]
    francisco: Fiquei doente, depois fui à guerra e voltei preso. E um dia, a cavalo, encontrei um leproso na estrada. Senti nojo.
- francisco: Mas desci do cavalo, dei-lhe o que tinha e beijei a mão dele. E o que me parecia amargo se converteu em doçura da alma e do corpo.
francisco: Depois, rezando aqui nesta capelinha caída, ouvi o Crucificado: "Francisco, vai e repara a minha casa, que está em ruínas."
espirito: Francisco aprendeu a ver Cristo em quem sofre. Isso é o dom da Piedade.
francisco: Receba-o, {g("meu irmão", "minha irmã")}. Não é coisa sua: é Deus amando os outros através das suas mãos.
~ evento("dom_piedade")
espirito: Agora, junto de quem sofre, aperte F para socorrer. Socorrer gasta {valor("custo_piedade")} de energia; quem é ajudado volta depois para retribuir. #pausa:1.4
francisco: O leproso que mora junto à estrada não tem ninguém. Vá até ele e faça o que eu fiz.
-> END

= sobre_leproso
francisco: Você ainda não foi ao leproso? Ele mora no casebre junto à estrada, perto do cruzeiro.
francisco: Não tenha medo dele. Tenha medo de passar ao lado e não ver.
-> END

= casa
{ valor("pedras") == 0:
    francisco: O leproso me contou o que você fez! Agora me ajude com outra coisa: esta casa do Senhor está caindo.
    francisco: Na pedreira velha, um pouco a sudoeste daqui, há pedras boas. Traga uma de cada vez e a assente aqui, na parede.
    francisco: Pedra por pedra. Foi assim que eu comecei: não com um sermão, mas com as mãos.
- else:
    francisco: Já {valor("pedras") == 1: há uma pedra|há {valor("pedras")} pedras} no lugar. Continue: pedra por pedra se levanta a casa do Senhor.
}
-> END

= sobre_lobo
francisco: São Damião está de pé! Ouça o sino, {nome()}.
francisco: Agora, tem um irmão que sofre e ninguém percebe: o lobo da toca, a leste. A cidade o odeia porque ele tem fome e ataca os rebanhos.
francisco: Ele não é mau: tem fome. Vá até ele, sem cajado e sem medo, e proponha a paz em nome de Deus.
-> END

= paz
francisco: Louvado sejas, meu Senhor, com todas as tuas criaturas! Com o irmão sol, a irmã lua, o irmão lobo.
francisco: Agora resta o banquete. A Gula só perde para quem aprendeu a repartir. Quando as portas se abrirem, não vá sozinho: os que você ajudou irão com você.
{ primeira("cidade_portas_abertas"):
    espirito: Ouviu? Lá no alto da cidade, as portas de ouro do palácio se abriram.
}
-> END

= vitoria
francisco: Irmão! Os sinos da cidade inteira estão tocando. Dizem que no palácio agora se come pão com os pobres.
francisco: A Gula queria encher você até não sobrar lugar para nada. Mas o coração só se enche de verdade quando se esvazia para os outros.
francisco: Vá em paz. A estrada para o Céu continua, e eu rezo por você. Paz e bem!
-> END

// ─────────────────────────────── O leproso ───────────────────────────────

=== leproso ===
{
- tem("cidade_leproso"): -> curado
- not tem("dom_piedade"): -> medo
- else: -> socorrer
}

= medo
leproso: Não chegue perto! Sou leproso. Fique longe, pela sua saúde.
leproso: Deixe alguma coisa na tigela, se quiser, e vá embora. Todos vão embora.
-> END

= socorrer
leproso: Você de novo? Por que voltou? Ninguém volta.
* [Ajoelhar-se e cuidar das feridas dele]
    { valor("energia") >= valor("custo_piedade"):
        leproso: …você tocou em mim.
        ~ evento("curar_leproso")
        leproso: Há anos ninguém tocava em mim. Eu já tinha esquecido que era gente.
        espirito: Quem serve o pobre serve o próprio Cristo. A ferida dele está fechando.
        leproso: Vá em paz. Eu não esqueço de você. Quando precisar, eu vou estar lá.
    - else:
        espirito: Você está sem força. Segure R e reze um pouco: a piedade nasce da oração.
    }
* [Ir embora]
    leproso: Eu sabia.
- -> END

= curado
{ primeira("cidade_retribuiu_leproso"):
    leproso: Olhe para mim! As feridas fecharam. Eu fui à cidade, e me deixaram entrar.
    leproso: Guardei para você este pão. É pouco, mas é tudo o que eu tenho.
    ~ evento("retribuir_leproso")
- else:
    leproso: Deus te pague, {g("meu irmão", "minha irmã")}. Rezo por você todas as noites.
}
-> END

// ─────────────────────────────── Os pobres da cidade ───────────────────────────────

=== tomas ===
{ tem("cidade_ajudou_tomas") and not tem("cidade_retribuiu_tomas"):
    ~ marcar("cidade_retribuiu_tomas")
    tomas: Você voltou! Eu reconheço o seu passo. Tome: ensinei os meus netos a rezar por você. É o que um cego pode dar.
    ~ evento("retribuir_tomas")
    -> END
}
{ tem("cidade_ajudou_tomas"):
    tomas: Deus te abençoe, {g("filho", "filha")}. Eu conto a todos quem me ajudou.
    -> END
}
tomas: Uma esmola para um velho cego? Os ricos passam por esta porta o dia inteiro, e nenhum para.
-> ajudar("tomas")

=== rita ===
{ tem("cidade_ajudou_rita") and not tem("cidade_retribuiu_rita"):
    ~ marcar("cidade_retribuiu_rita")
    rita: Você! Arrumei trabalho na casa do padeiro, graças ao que você fez. Leve este pão, ainda quente.
    ~ evento("retribuir_rita")
    -> END
}
{ tem("cidade_ajudou_rita"):
    rita: Meus filhos dormiram de barriga cheia. Que Deus te guarde no caminho.
    -> END
}
rita: Meu marido morreu no inverno. Tenho três filhos em casa e nada para pôr na mesa.
rita: Enquanto isso, ali no palácio, jogam comida fora todas as noites.
-> ajudar("rita")

=== beppo ===
{ tem("cidade_ajudou_beppo") and not tem("cidade_retribuiu_beppo"):
    ~ marcar("cidade_retribuiu_beppo")
    beppo: Ei! Aprendi uma música com os frades. Quer ouvir? "Louvado sejas, meu Senhor, pela irmã água…"
    ~ evento("retribuir_beppo")
    -> END
}
{ tem("cidade_ajudou_beppo"):
    beppo: Os frades me deixaram dormir no convento! Eu vou ser frade também, quando crescer.
    -> END
}
beppo: Moço… você tem alguma coisa de comer? Faz dois dias que eu durmo aqui na escada.
-> ajudar("beppo")

/// Escolhas comuns aos pobres: dar o ouro da Gula, socorrer com a Piedade, ou seguir.
=== ajudar(quem) ===
* { valor("peso") > 0 } [Dar a ele o ouro que pesa em você]
    ~ evento("doar_" + quem)
    espirito: O ouro que pesava em você agora alimenta uma família. "Ajuntai tesouros no Céu." (Mt 6,20)
* { nivel("piedade") > 0 } [Socorrer: repartir o que você tem ({valor("custo_piedade")} de energia)]
    { valor("energia") >= valor("custo_piedade"):
        ~ evento("socorrer_" + quem)
    - else:
        espirito: Você está sem força. Segure R e reze um pouco: a piedade nasce da oração.
    }
* [Seguir caminho]
- -> END

// ─────────────────────────────── O lobo ───────────────────────────────

=== lobo_toca ===
{ not tem("dom_piedade"):
    espirito: O lobo rosna da boca da toca. Os olhos dele são de fome, não de maldade.
    espirito: Não há nada que você possa fazer por ele ainda.
    -> END
}
espirito: O lobo mostra os dentes. Está magro, com as costelas aparecendo.
* [Falar com ele como Francisco falaria]
    espirito: "Irmão lobo, você faz muito mal nesta terra. Mas eu quero fazer a paz entre você e esta gente."
    espirito: "Se você não fizer mais mal a ninguém, a cidade vai te dar de comer todos os dias, enquanto você viver."
    espirito: O lobo baixa a cabeça. Depois, devagar, põe a pata na sua mão.
    ~ evento("pacto_lobo")
    espirito: Ele vai com você. Leve-o até a cidade, para o povo ver que a paz foi feita.
* [Afastar-se devagar]
    espirito: O lobo volta para o escuro da toca.
- -> END

=== lobo_cidade ===
{ primeira("cidade_lobo_praca"):
    mercador: O lobo! Dentro da cidade! …Ele está deitado na praça, manso como um cão.
    espirito: A cidade toda veio ver. Uma mulher trouxe pão; um menino, água. A paz foi feita.
- else:
    espirito: O irmão lobo abana o rabo. Cada dia uma casa diferente lhe dá de comer.
}
-> END

// ─────────────────────────────── O mercador ───────────────────────────────

=== mercador ===
{ tem("cidade_lobo_praca"):
    mercador: Quem diria: o lobo, deitado na praça! E foi você que o trouxe…
    mercador: Talvez eu também esteja com fome de outra coisa. Vou levar pão à viúva da praça.
    -> END
}
mercador: Bem-vindo à cidade mais rica da Úmbria! Ouro na praça, ouro nos telhados.
mercador: Só tome cuidado fora dos muros: um lobo enorme anda comendo os nossos rebanhos. Ninguém sai depois do pôr do sol.
mercador: E não ligue para os mendigos. Se a gente dá, eles voltam.
-> END
