// ─────────────────────────────────────────────────────────────────────────────
// O Palácio da Gula: o Salão do Banquete e a luta contra a Gula, "O Banquete sem fim".
// valor("ajudantes"): quantos pobres que o peregrino ajudou na cidade vieram com ele.
// ─────────────────────────────────────────────────────────────────────────────

=== palacio_chegada ===
espirito: Ouro nas paredes, ouro no chão, ouro nos pratos. E ninguém sorri.
espirito: Ouve as risadas e o barulho dos talheres? Vêm do fundo do salão. O banquete começou há muito tempo e não acaba nunca.
{ valor("ajudantes") > 0:
    espirito: Você não está sozinho. {valor("ajudantes") == 1: Quem você ajudou na cidade veio com você|Os que você ajudou na cidade vieram com você}, como Francisco disse.
- else:
    espirito: Você veio sozinho. Ninguém da cidade veio com você. Ainda dá para voltar e servir quem precisa.
}
-> END

=== palacio_gula ===
gula: Um convidado! Sente-se, sente-se! Tem lugar para todo mundo à minha mesa. Coma!
gula: Ninguém sai daqui com fome. Ninguém sai daqui, aliás.
espirito: É a Gula. Ela nunca se sacia: enquanto houver travessas cheias nas mesas, ela come, e nada a fere.
espirito: Derrube as travessas com a luz ou com o cajado. Com a mesa vazia, ela sente fome e fica fraca: aí, golpeie.
espirito: Os pratos que ela atira não ferem, mas pesam. Cheio, você fica lento e quase não pula.
{ valor("ajudantes") > 0:
    espirito: Reparta o peso com os pobres que vieram com você: chegue perto e aperte F. "Há mais alegria em dar do que em receber." (At 20,35)
}
espirito: E, se o peso crescer, jejue: segure R e reze. Quem jejua fica leve.
-> END

=== palacio_vencida ===
espirito: A Gula se desfez. Sobrou o que sempre esteve na mesa: pão.
espirito: "Quando deres um banquete, convida os pobres, os aleijados, os coxos e os cegos; e serás feliz, porque eles não têm com que te retribuir." (Lc 14,13-14)
{ valor("ajudantes") > 0:
    espirito: Agora a mesa é deles. Sente-se também: o banquete do Céu começa assim, repartido.
- else:
    espirito: A mesa ficou vazia de gente. Volte à cidade: há quem precise sentar-se aqui.
}
espirito: A Cidade Dourada está livre. Volte a Francisco, em São Damião: ele vai querer saber.
-> END

// Depois da vitória, à mesa dos pobres
=== palacio_tomas ===
tomas: Eu não vejo a mesa, mas sinto o cheiro do pão. É o melhor banquete da minha vida. #gesto:peito
-> END

=== palacio_rita ===
rita: Meus filhos estão comendo no palácio. Quem diria! Que Deus lhe pague, peregrino. #gesto:rezar
-> END

=== palacio_beppo ===
beppo: Tem peixe! E pão! E ninguém manda a gente embora! #gesto:acolher
-> END

=== palacio_leproso ===
leproso: Antes, nem da porta da cidade eu passava. Hoje como no palácio, ao lado de todo mundo. #gesto:acolher
-> END
