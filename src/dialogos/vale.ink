// ═══════════════════════════ O Vale do Esquecimento ═══════════════════════════

=== vale_intro ===
espirito: {nome()}, a estrada para o Céu começa aqui, junto a esta fogueira.
espirito: Sombras roubaram as cores do Vale. Chegue perto delas, trave a mira com Q e dissipe-as com o cajado ou com a luz.
espirito: A luz gasta energia espiritual. Quando faltar, pare e reze: segure R.
espirito: Siga a estrada até a capela no alto do monte. Eu estarei com você.
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
